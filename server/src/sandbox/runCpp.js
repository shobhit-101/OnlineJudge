"use strict";

// Step 3 — bare compile & run from Node.
// Step 4 — lock the container down: no network, capped memory/pids, read-only
//          filesystem (writable tmpfs workspace only), dropped Linux
//          capabilities, no privilege escalation, and a host-side wall-clock
//          timeout on both compile and run.
//
// Shape: one container per submission (DECISIONS 004), driven via `docker exec`,
// always torn down in a `finally`.

const { spawn } = require("node:child_process");
const { randomUUID } = require("node:crypto");
const path = require("node:path");

const IMAGE = "oj-cpp-runner:2";

// Sandbox-level outcomes (Step 6). These map onto verdicts later: OK still needs
// output comparison to become AC vs WA; the rest are already final.
const OUTCOME = {
  OK: "OK", // compiled, ran, exited 0 — output comparison decides AC/WA
  CE: "CE", // compilation failed
  TLE: "TLE", // exceeded the wall-clock limit
  MLE: "MLE", // exceeded the memory limit (OOM-killed)
  RE: "RE", // crashed / non-zero exit
};

// Custom seccomp allowlist (Step 5): deny-by-default syscall filter. Absolute
// path so the docker CLI can read it regardless of cwd.
const SECCOMP_PROFILE = path.join(__dirname, "seccomp", "cpp-seccomp.json");

// How long the keep-alive container lives at most. The real per-step bounds are
// the timeouts below; this is just a backstop so a crashed worker can't orphan a
// container forever (it's also force-removed in `finally`).
const CONTAINER_TTL_SEC = 300;

// uid/gid of the unprivileged `runner` user baked into the image.
const RUNNER_UID = 1000;
const RUNNER_GID = 1000;

const DEFAULT_LIMITS = {
  compileTimeMs: 10000, // wall-clock cap on compilation (compile-bomb guard)
  runTimeMs: 2000, // wall-clock cap on a single execution -> TLE
  memoryMb: 256, // hard memory ceiling (mem+swap) -> MLE
  pidsLimit: 64, // max processes -> contains fork bombs
  workspaceSizeMb: 64, // size of the writable tmpfs scratch space
};

/**
 * Build the hardened `docker run` argument list for the keep-alive container.
 * Each flag maps to a real attack we're defending against.
 */
function dockerRunArgs(name, limits) {
  const { memoryMb, pidsLimit, workspaceSizeMb } = limits;
  return [
    "run", "-d", "--name", name,

    // --- isolation ---
    "--network", "none", // no internet / localhost / other services
    "--memory", `${memoryMb}m`, // memory ceiling
    "--memory-swap", `${memoryMb}m`, // == memory => swap disabled (real cap)
    "--pids-limit", String(pidsLimit), // kill fork bombs
    "--cap-drop", "ALL", // no Linux capabilities at all
    "--security-opt", "no-new-privileges", // can't gain privileges via setuid
    "--security-opt", `seccomp=${SECCOMP_PROFILE}`, // deny-by-default syscall allowlist
    "--read-only", // root filesystem is immutable
    // The only writable places are small in-memory tmpfs mounts owned by runner.
    // /sandbox must allow exec (we run the compiled binary from here).
    "--tmpfs", `/sandbox:rw,exec,nosuid,size=${workspaceSizeMb}m,uid=${RUNNER_UID},gid=${RUNNER_GID}`,
    "--tmpfs", `/tmp:rw,nosuid,nodev,size=${workspaceSizeMb}m,uid=${RUNNER_UID},gid=${RUNNER_GID}`,
    "--user", `${RUNNER_UID}:${RUNNER_GID}`, // never root (belt + suspenders)

    IMAGE,
    "sleep", String(CONTAINER_TTL_SEC),
  ];
}

/**
 * Run a `docker` subcommand, capturing stdout/stderr/exit code.
 * If `input` is given, it is written to stdin. If `timeoutMs` is given and the
 * command runs longer, the docker client is killed and `timedOut` is set.
 *
 * @param {string[]} args
 * @param {{input?: string, timeoutMs?: number}} [opts]
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
          child.kill("SIGKILL"); // kills the docker client; container killed in finally
        }, timeoutMs)
      : null;

    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("error", (err) => {
      if (timer) clearTimeout(timer);
      reject(err); // e.g. docker not on PATH
    });
    child.on("close", (code) => {
      if (timer) clearTimeout(timer);
      resolve({ code, stdout, stderr, timedOut });
    });

    child.stdin.end(input ?? "");
  });
}

/**
 * Compile and run a single C++ source inside a fresh, locked-down container.
 *
 * @param {object} opts
 * @param {string} opts.source         - C++ source code
 * @param {string} [opts.input]        - stdin fed to the program
 * @param {object} [opts.limits]       - overrides for DEFAULT_LIMITS
 * @returns {Promise<{
 *   compileOk: boolean,
 *   compileOutput: string,
 *   stdout: string,
 *   stderr: string,
 *   exitCode: number|null,
 *   timedOut: boolean,
 *   timeMs: number
 * }>}
 */
async function runCpp({ source, input = "", limits = {} } = {}) {
  const lim = { ...DEFAULT_LIMITS, ...limits };
  const name = `oj-cpp-${randomUUID()}`;

  // 1. Start the hardened keep-alive container.
  const started = await docker(dockerRunArgs(name, lim));
  if (started.code !== 0) {
    throw new Error(`failed to start container: ${started.stderr.trim()}`);
  }

  try {
    // 2. Put the source inside the container.
    const put = await docker(["exec", "-i", name, "sh", "-c", "cat > main.cpp"], {
      input: source,
    });
    if (put.code !== 0) {
      throw new Error(`failed to write source: ${put.stderr.trim()}`);
    }

    // 3. Compile (inside the locked container, under a wall-clock cap).
    const compile = await docker(
      ["exec", name, "g++", "-O2", "-std=c++17", "-o", "main", "main.cpp"],
      { timeoutMs: lim.compileTimeMs }
    );
    if (compile.timedOut) {
      return ce("compilation timed out");
    }
    if (compile.code !== 0) {
      return ce(compile.stderr || compile.stdout);
    }

    // 4. Run under GNU time (for max RSS), feeding the test input, under a
    //    wall-clock cap (-> TLE). `time` writes its report to a file so the
    //    program's own stdout/stderr stay clean.
    const t0 = Date.now();
    const run = await docker(
      ["exec", "-i", name, "/usr/bin/time", "-v", "-o", "/sandbox/.time", "./main"],
      { input, timeoutMs: lim.runTimeMs }
    );
    const timeMs = Date.now() - t0;

    // 5. Classify the outcome from the raw signals.
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

// Was the (exec'd) process OOM-killed? Container-level flag; correct for the
// one-run-per-container case here. Step 12 (many runs per container) will switch
// to the per-run cgroup `oom_kill` counter, since this flag sticks once set.
async function inspectOomKilled(name) {
  const r = await docker(["inspect", name, "--format", "{{.State.OOMKilled}}"]);
  return r.stdout.trim() === "true";
}

// Parse peak memory (KB) from GNU time's report.
async function readMaxRss(name) {
  const r = await docker(["exec", name, "cat", "/sandbox/.time"]);
  if (r.code !== 0) return null;
  const m = r.stdout.match(/Maximum resident set size \(kbytes\):\s*(\d+)/);
  return m ? Number(m[1]) : null;
}

// Assemble a full, uniform result object from an outcome + the known fields.
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

// Helper: shape a Compilation-Error result.
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

module.exports = { runCpp, DEFAULT_LIMITS, OUTCOME };
