"use strict";

// Step 3 — drive the C++ runner container from Node: get code in, compile it,
// run it with stdin, capture output. NO resource limits yet (time/memory/
// network/fs). Those land in Steps 4-5; this is the bare mechanism.
//
// Shape: one container per submission (DECISIONS 004). We start a throwaway
// container, copy the source in, compile ONCE, then run. Later (Step 12) the
// same container will run many test cases via repeated `docker exec`.

const { spawn } = require("node:child_process");
const { randomUUID } = require("node:crypto");

const IMAGE = "oj-cpp-runner:1";

/**
 * Run a `docker` subcommand, capturing stdout/stderr/exit code.
 * If `input` is given, it is written to the process's stdin.
 *
 * @param {string[]} args - arguments passed to the docker CLI
 * @param {{input?: string}} [opts]
 * @returns {Promise<{code: number|null, stdout: string, stderr: string}>}
 */
function docker(args, { input } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn("docker", args, { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("error", reject); // e.g. docker not on PATH
    child.on("close", (code) => resolve({ code, stdout, stderr }));
    child.stdin.end(input ?? "");
  });
}

/**
 * Compile and run a single C++ source inside a fresh container.
 *
 * @param {object} opts
 * @param {string} opts.source   - C++ source code
 * @param {string} [opts.input]  - stdin fed to the program at run time
 * @returns {Promise<{
 *   compileOk: boolean,
 *   compileOutput: string,
 *   stdout: string,
 *   stderr: string,
 *   exitCode: number|null
 * }>}
 */
async function runCpp({ source, input = "" }) {
  const name = `oj-cpp-${randomUUID()}`;

  // 1. Start a throwaway container that stays alive while we drive it.
  //    `sleep` just keeps it running; the real work happens via `docker exec`.
  const started = await docker(["run", "-d", "--name", name, IMAGE, "sleep", "60"]);
  if (started.code !== 0) {
    throw new Error(`failed to start container: ${started.stderr.trim()}`);
  }

  try {
    // 2. Put the source inside the container by piping it into a file.
    const put = await docker(["exec", "-i", name, "sh", "-c", "cat > main.cpp"], {
      input: source,
    });
    if (put.code !== 0) {
      throw new Error(`failed to write source: ${put.stderr.trim()}`);
    }

    // 3. Compile. A non-zero exit here is a Compilation Error (CE), not a crash.
    const compile = await docker([
      "exec", name, "g++", "-O2", "-std=c++17", "-o", "main", "main.cpp",
    ]);
    if (compile.code !== 0) {
      return {
        compileOk: false,
        compileOutput: compile.stderr || compile.stdout,
        stdout: "",
        stderr: "",
        exitCode: null,
      };
    }

    // 4. Run the compiled program, feeding the test input on stdin.
    const run = await docker(["exec", "-i", name, "./main"], { input });
    return {
      compileOk: true,
      compileOutput: "",
      stdout: run.stdout,
      stderr: run.stderr,
      exitCode: run.code,
    };
  } finally {
    // 5. Always tear the container down, success or failure.
    await docker(["rm", "-f", name]);
  }
}

module.exports = { runCpp };
