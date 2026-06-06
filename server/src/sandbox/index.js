"use strict";

// The sandbox module's public API.
//
// openSandbox() — start a fresh hardened container, write the source, and compile
// ONCE; the returned session can then run() many inputs in that same container
// (compile once / run many, DECISIONS 004) and close() tears it down.
//
// runInSandbox() — convenience wrapper: one container, one run, auto teardown.
//
// Hardening (Steps 4-5): no network, capped memory/pids/wall-clock-time, read-only
// filesystem with a writable tmpfs workspace, all capabilities dropped,
// no-new-privileges, and a deny-by-default seccomp syscall allowlist.
//
// Language-specific bits (image, source filename, compile/run commands) live in
// languages.js — this file is language-agnostic.

const { spawn } = require("node:child_process");
const { randomUUID } = require("node:crypto");
const path = require("node:path");
const { languages } = require("./languages");

const CONTAINER_TTL_SEC = 300; // backstop lifetime; real bounds are the timeouts
const RUNNER_UID = 1000;
const RUNNER_GID = 1000;
const SECCOMP_PROFILE = path.join(__dirname, "seccomp", "cpp-seccomp.json");

const OUTCOME = { OK: "OK", CE: "CE", TLE: "TLE", MLE: "MLE", RE: "RE" };

const DEFAULT_LIMITS = {
  compileTimeMs: 10000, // wall-clock cap on compilation (compile-bomb guard)
  runTimeMs: 2000, // wall-clock cap on a single execution -> TLE
  memoryMb: 256, // hard memory ceiling (mem+swap) -> MLE
  pidsLimit: 64, // max processes -> contains fork bombs
  workspaceSizeMb: 64, // size of the writable tmpfs scratch space
};

function dockerRunArgs(name, image, limits) {
  const { memoryMb, pidsLimit, workspaceSizeMb } = limits;
  return [
    "run", "-d", "--name", name,
    "--network", "none",
    "--memory", `${memoryMb}m`,
    "--memory-swap", `${memoryMb}m`,
    "--pids-limit", String(pidsLimit),
    "--cap-drop", "ALL",
    "--security-opt", "no-new-privileges",
    "--security-opt", `seccomp=${SECCOMP_PROFILE}`,
    "--read-only",
    "--tmpfs", `/sandbox:rw,exec,nosuid,size=${workspaceSizeMb}m,uid=${RUNNER_UID},gid=${RUNNER_GID}`,
    "--tmpfs", `/tmp:rw,nosuid,nodev,size=${workspaceSizeMb}m,uid=${RUNNER_UID},gid=${RUNNER_GID}`,
    "--user", `${RUNNER_UID}:${RUNNER_GID}`,
    image,
    "sleep", String(CONTAINER_TTL_SEC),
  ];
}

/**
 * Run a `docker` subcommand, capturing stdout/stderr/exit code. If `input` is
 * given it is written to stdin; if `timeoutMs` is exceeded the docker client is
 * killed and `timedOut` is set (the container is torn down by the caller).
 */
function docker(args, { input, timeoutMs } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn("docker", args, { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timer = timeoutMs
      ? setTimeout(() => {
          timedOut = true;
          child.kill("SIGKILL");
        }, timeoutMs)
      : null;

    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("error", (err) => {
      if (timer) clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code) => {
      if (timer) clearTimeout(timer);
      resolve({ code, stdout, stderr, timedOut });
    });

    child.stdin.end(input ?? "");
  });
}

/**
 * Start a hardened container and compile once. Returns a session:
 *   { compile: {ok, output}, run(input) -> RunResult, close() }
 */
async function openSandbox({ language, code, limits = {} } = {}) {
  const spec = languages[language];
  if (!spec) throw new Error(`unknown language: ${language}`);

  const lim = { ...DEFAULT_LIMITS, ...limits };
  const name = `oj-${language}-${randomUUID()}`;

  const started = await docker(dockerRunArgs(name, spec.image, lim));
  if (started.code !== 0) {
    throw new Error(`failed to start container: ${started.stderr.trim()}`);
  }

  let compile;
  try {
    const put = await docker(["exec", "-i", name, "sh", "-c", `cat > ${spec.sourceFile}`], {
      input: code,
    });
    if (put.code !== 0) throw new Error(`failed to write source: ${put.stderr.trim()}`);

    if (spec.compile) {
      const c = await docker(["exec", name, ...spec.compile], {
        timeoutMs: lim.compileTimeMs,
      });
      if (c.timedOut) compile = { ok: false, output: "compilation timed out" };
      else if (c.code !== 0) compile = { ok: false, output: c.stderr || c.stdout };
      else compile = { ok: true, output: "" };
    } else {
      compile = { ok: true, output: "" };
    }
  } catch (err) {
    await docker(["rm", "-f", name]); // don't leak the container on setup failure
    throw err;
  }

  // Baseline the cgroup OOM-kill counter; each run() detects OOM by the delta
  // (per-run, unlike .State.OOMKilled which is container-level and sticky).
  let oomBaseline = compile.ok ? await readOomKillCount(name) : 0;

  return {
    compile,

    async run(input = "") {
      const t0 = Date.now();
      const r = await docker(
        ["exec", "-i", name, "/usr/bin/time", "-v", "-o", "/sandbox/.time", ...spec.run],
        { input, timeoutMs: lim.runTimeMs }
      );
      const timeMs = Date.now() - t0;

      if (r.timedOut) return runResult(OUTCOME.TLE, { timedOut: true, timeMs });

      const oomNow = await readOomKillCount(name);
      const oomKilled = oomNow > oomBaseline;
      oomBaseline = oomNow;
      const memoryKb = await readMaxRss(name);

      let outcome;
      if (oomKilled) outcome = OUTCOME.MLE;
      else if (r.code !== 0) outcome = OUTCOME.RE;
      else outcome = OUTCOME.OK; // AC vs WA decided by output comparison

      return runResult(outcome, {
        stdout: r.stdout,
        stderr: r.stderr,
        exitCode: r.code,
        oomKilled,
        timeMs,
        memoryKb,
      });
    },

    async close() {
      await docker(["rm", "-f", name]);
    },
  };
}

/**
 * Convenience: compile and run a single input in a throwaway container.
 * Returns the old combined shape (with compileOk/compileOutput).
 */
async function runInSandbox({ language, code, input = "", limits = {} } = {}) {
  const session = await openSandbox({ language, code, limits });
  try {
    if (!session.compile.ok) {
      return {
        outcome: OUTCOME.CE,
        compileOk: false,
        compileOutput: session.compile.output,
        stdout: "",
        stderr: "",
        exitCode: null,
        timedOut: false,
        oomKilled: false,
        timeMs: 0,
        memoryKb: null,
      };
    }
    const r = await session.run(input);
    return { compileOk: true, compileOutput: "", ...r };
  } finally {
    await session.close();
  }
}

// Read the cgroup v2 cumulative OOM-kill count for the container.
async function readOomKillCount(name) {
  const r = await docker(["exec", name, "cat", "/sys/fs/cgroup/memory.events"]);
  if (r.code !== 0) return 0;
  const m = r.stdout.match(/oom_kill (\d+)/);
  return m ? Number(m[1]) : 0;
}

// Parse peak memory (KB) from GNU time's report file.
async function readMaxRss(name) {
  const r = await docker(["exec", name, "cat", "/sandbox/.time"]);
  if (r.code !== 0) return null;
  const m = r.stdout.match(/Maximum resident set size \(kbytes\):\s*(\d+)/);
  return m ? Number(m[1]) : null;
}

function runResult(outcome, fields) {
  return {
    outcome,
    stdout: "",
    stderr: "",
    exitCode: null,
    timedOut: false,
    oomKilled: false,
    timeMs: 0,
    memoryKb: null,
    ...fields,
  };
}

module.exports = { openSandbox, runInSandbox, languages, OUTCOME, DEFAULT_LIMITS };
