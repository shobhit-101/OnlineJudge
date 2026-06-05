"use strict";

// The sandbox module's public API: runInSandbox().
//
// Compiles (if the language needs it) and runs untrusted code inside a fresh,
// fully hardened, throwaway Docker container, then returns a classified outcome
// with time + memory. The container is always destroyed afterward.
//
// Hardening (Steps 4-5): no network, capped memory/pids/wall-clock-time,
// read-only filesystem with a writable tmpfs workspace, all Linux capabilities
// dropped, no-new-privileges, and a deny-by-default seccomp syscall allowlist.
//
// Language-specific bits (image, source filename, compile/run commands) live in
// languages.js — this file is language-agnostic.

const { spawn } = require("node:child_process");
const { randomUUID } = require("node:crypto");
const path = require("node:path");
const { languages } = require("./languages");

// Backstop lifetime for the keep-alive container (real bounds are the timeouts
// below; this just prevents a crashed worker from orphaning a container).
const CONTAINER_TTL_SEC = 300;

// uid/gid of the unprivileged `runner` user baked into the images.
const RUNNER_UID = 1000;
const RUNNER_GID = 1000;

// Shared seccomp allowlist. Currently tuned for C++ but generous enough to be a
// reasonable default; Phase 5 can add per-language profiles to the spec if needed.
const SECCOMP_PROFILE = path.join(__dirname, "seccomp", "cpp-seccomp.json");

// Sandbox-level outcomes. OK still needs output comparison to become AC vs WA;
// the rest are already final verdicts.
const OUTCOME = {
  OK: "OK",
  CE: "CE",
  TLE: "TLE",
  MLE: "MLE",
  RE: "RE",
};

const DEFAULT_LIMITS = {
  compileTimeMs: 10000, // wall-clock cap on compilation (compile-bomb guard)
  runTimeMs: 2000, // wall-clock cap on a single execution -> TLE
  memoryMb: 256, // hard memory ceiling (mem+swap) -> MLE
  pidsLimit: 64, // max processes -> contains fork bombs
  workspaceSizeMb: 64, // size of the writable tmpfs scratch space
};

/**
 * Build the hardened `docker run` argument list. Each flag maps to a real attack
 * we defend against (see Steps 4-5 / the threat model).
 */
function dockerRunArgs(name, image, limits) {
  const { memoryMb, pidsLimit, workspaceSizeMb } = limits;
  return [
    "run", "-d", "--name", name,

    "--network", "none", // no internet / localhost / other services
    "--memory", `${memoryMb}m`, // memory ceiling
    "--memory-swap", `${memoryMb}m`, // == memory => swap disabled (real cap)
    "--pids-limit", String(pidsLimit), // kill fork bombs
    "--cap-drop", "ALL", // no Linux capabilities
    "--security-opt", "no-new-privileges", // no setuid escalation
    "--security-opt", `seccomp=${SECCOMP_PROFILE}`, // deny-by-default syscall allowlist
    "--read-only", // immutable root filesystem
    "--tmpfs", `/sandbox:rw,exec,nosuid,size=${workspaceSizeMb}m,uid=${RUNNER_UID},gid=${RUNNER_GID}`,
    "--tmpfs", `/tmp:rw,nosuid,nodev,size=${workspaceSizeMb}m,uid=${RUNNER_UID},gid=${RUNNER_GID}`,
    "--user", `${RUNNER_UID}:${RUNNER_GID}`, // never root

    image,
    "sleep", String(CONTAINER_TTL_SEC),
  ];
}

/**
 * Run a `docker` subcommand, capturing stdout/stderr/exit code. If `input` is
 * given it is written to stdin. If `timeoutMs` is given and exceeded, the docker
 * client is killed and `timedOut` is set (the container is torn down by caller).
 *
 * @returns {Promise<{code:number|null, stdout:string, stderr:string, timedOut:boolean}>}
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
 * Compile (if needed) and run untrusted code in a hardened, throwaway container.
 *
 * @param {object} opts
 * @param {string} opts.language - key into languages.js (e.g. "cpp")
 * @param {string} opts.code     - the source code to run
 * @param {string} [opts.input]  - stdin fed to the program
 * @param {object} [opts.limits] - overrides for DEFAULT_LIMITS
 * @returns {Promise<{
 *   outcome: string, compileOk: boolean, compileOutput: string,
 *   stdout: string, stderr: string, exitCode: number|null,
 *   timedOut: boolean, oomKilled: boolean, timeMs: number, memoryKb: number|null
 * }>}
 */
async function runInSandbox({ language, code, input = "", limits = {} } = {}) {
  const spec = languages[language];
  if (!spec) throw new Error(`unknown language: ${language}`);

  const lim = { ...DEFAULT_LIMITS, ...limits };
  const name = `oj-${language}-${randomUUID()}`;

  // 1. Start the hardened keep-alive container for this language's image.
  const started = await docker(dockerRunArgs(name, spec.image, lim));
  if (started.code !== 0) {
    throw new Error(`failed to start container: ${started.stderr.trim()}`);
  }

  try {
    // 2. Write the source into the container.
    const put = await docker(
      ["exec", "-i", name, "sh", "-c", `cat > ${spec.sourceFile}`],
      { input: code }
    );
    if (put.code !== 0) {
      throw new Error(`failed to write source: ${put.stderr.trim()}`);
    }

    // 3. Compile if the language needs it (non-zero / timeout => CE).
    if (spec.compile) {
      const compile = await docker(["exec", name, ...spec.compile], {
        timeoutMs: lim.compileTimeMs,
      });
      if (compile.timedOut) return ce("compilation timed out");
      if (compile.code !== 0) return ce(compile.stderr || compile.stdout);
    }

    // 4. Run under GNU time (max RSS), feeding stdin, under a wall-clock cap.
    const t0 = Date.now();
    const run = await docker(
      ["exec", "-i", name, "/usr/bin/time", "-v", "-o", "/sandbox/.time", ...spec.run],
      { input, timeoutMs: lim.runTimeMs }
    );
    const timeMs = Date.now() - t0;

    // 5. Classify.
    if (run.timedOut) {
      return result(OUTCOME.TLE, {
        stdout: run.stdout,
        stderr: run.stderr,
        exitCode: null,
        timedOut: true,
        timeMs,
      });
    }

    const oomKilled = await inspectOomKilled(name);
    const memoryKb = await readMaxRss(name);

    let outcome;
    if (oomKilled) outcome = OUTCOME.MLE;
    else if (run.code !== 0) outcome = OUTCOME.RE;
    else outcome = OUTCOME.OK; // AC vs WA decided later by output comparison

    return result(outcome, {
      stdout: run.stdout,
      stderr: run.stderr,
      exitCode: run.code,
      oomKilled,
      timeMs,
      memoryKb,
    });
  } finally {
    // 6. Always demolish the container.
    await docker(["rm", "-f", name]);
  }
}

// Was the (exec'd) process OOM-killed? Container-level flag; correct for one run
// per container. Step 12 (many runs per container) switches to the per-run
// cgroup `oom_kill` counter, since this flag sticks once set.
async function inspectOomKilled(name) {
  const r = await docker(["inspect", name, "--format", "{{.State.OOMKilled}}"]);
  return r.stdout.trim() === "true";
}

// Parse peak memory (KB) from GNU time's report file.
async function readMaxRss(name) {
  const r = await docker(["exec", name, "cat", "/sandbox/.time"]);
  if (r.code !== 0) return null;
  const m = r.stdout.match(/Maximum resident set size \(kbytes\):\s*(\d+)/);
  return m ? Number(m[1]) : null;
}

// Assemble a uniform result from an outcome + the known fields.
function result(outcome, fields) {
  return {
    outcome,
    compileOk: true,
    compileOutput: "",
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

// Shape a Compilation-Error result.
function ce(message) {
  return {
    outcome: OUTCOME.CE,
    compileOk: false,
    compileOutput: message,
    stdout: "",
    stderr: "",
    exitCode: null,
    timedOut: false,
    oomKilled: false,
    timeMs: 0,
    memoryKb: null,
  };
}

module.exports = { runInSandbox, languages, OUTCOME, DEFAULT_LIMITS };
