"use strict";

// The verdict engine. Given a submission (language + code) and a problem with its
// test cases, assemble the harness, compile ONCE, run every case in the same
// container, and produce a single verdict: AC / WA / TLE / MLE / RE / CE.
//
// Cases run in order and we stop at the first failure (the case the user "fails
// on"), reporting its detail — standard LeetCode behaviour. CE is decided at
// compile time, before any case runs.

const { openSandbox } = require("../sandbox/index.js");
const { getStrategy, serializeInput, serializeExpected, compareOutput } = require("./index.js");

const VERDICT = { AC: "AC", WA: "WA", TLE: "TLE", MLE: "MLE", RE: "RE", CE: "CE" };

/**
 * @param {object} opts
 * @param {string} opts.language
 * @param {string} opts.code               - the user's Solution class
 * @param {object} opts.problem            - problem doc (needs .signature, .limits)
 * @param {object[]} opts.testcases        - cases to run, in order (each .input/.expected/.index)
 * @returns {Promise<{verdict, passed, total, compileOutput, failedCase, stats}>}
 */
async function judge({ language, code, problem, testcases }) {
  const strategy = getStrategy(language);
  const harness = strategy.buildHarness({ signature: problem.signature, code });

  // Per-problem limit overrides, if any.
  const limits = {};
  if (problem.limits && problem.limits.timeMs) limits.runTimeMs = problem.limits.timeMs;
  if (problem.limits && problem.limits.memoryMb) limits.memoryMb = problem.limits.memoryMb;

  const session = await openSandbox({ language, code: harness, limits });
  try {
    if (!session.compile.ok) {
      return {
        verdict: VERDICT.CE,
        passed: 0,
        total: testcases.length,
        compileOutput: session.compile.output,
        failedCase: null,
        stats: { timeMs: 0, memoryKb: 0 },
      };
    }

    let maxTimeMs = 0;
    let maxMemoryKb = 0;
    let passed = 0;

    for (const tc of testcases) {
      const input = serializeInput(tc.input, problem.signature.params);
      const expected = serializeExpected(tc.expected, problem.signature.returnType);
      const r = await session.run(input);

      maxTimeMs = Math.max(maxTimeMs, r.timeMs || 0);
      if (r.memoryKb) maxMemoryKb = Math.max(maxMemoryKb, r.memoryKb);

      if (r.outcome === "OK") {
        if (compareOutput(r.stdout, expected)) {
          passed++;
          continue;
        }
        return fail(VERDICT.WA, tc, r, passed, testcases.length, maxTimeMs, maxMemoryKb);
      }
      // r.outcome is TLE / MLE / RE — already a final verdict for this case.
      return fail(r.outcome, tc, r, passed, testcases.length, maxTimeMs, maxMemoryKb);
    }

    return {
      verdict: VERDICT.AC,
      passed,
      total: testcases.length,
      compileOutput: "",
      failedCase: null,
      stats: { timeMs: maxTimeMs, memoryKb: maxMemoryKb },
    };
  } finally {
    await session.close();
  }
}

function fail(verdict, tc, r, passed, total, timeMs, memoryKb) {
  return {
    verdict,
    passed,
    total,
    compileOutput: "",
    failedCase: {
      index: tc.index,
      input: tc.input,
      expected: tc.expected,
      actual: (r.stdout || "").trim(),
    },
    stats: { timeMs, memoryKb },
  };
}

module.exports = { judge, VERDICT };
