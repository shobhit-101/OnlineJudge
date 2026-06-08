"use strict";

// Dev tool: runs a known-correct reference solution for every problem through the
// REAL judge and asserts AC against all of its cases (samples + hidden). This is
// how we trust the authored test data — if an `expected` value is wrong, a correct
// solution fails here. Needs Docker + the oj-cpp-runner image (no Mongo/Redis). Run:
//   npm run -w @oj/server problems:verify

const { judge } = require("../../engine/judge");
const PROBLEMS = require("./index");
const SOLUTIONS = require("./_solutions");

async function main() {
  let failed = 0;

  for (const { problem, testcases } of PROBLEMS) {
    const code = SOLUTIONS[problem.slug];
    if (!code) {
      console.log(`?  ${problem.slug}: no reference solution`);
      failed++;
      continue;
    }

    let res;
    try {
      res = await judge({ language: "cpp", code, problem, testcases });
    } catch (e) {
      console.log(`x  ${problem.slug}: judge error — ${e.message}`);
      failed++;
      continue;
    }

    if (res.verdict === "AC" && res.passed === testcases.length) {
      console.log(`ok ${problem.slug}: AC (${res.passed}/${res.total})`);
    } else {
      failed++;
      const fc = res.failedCase;
      console.log(
        `x  ${problem.slug}: ${res.verdict} (${res.passed}/${res.total})` +
          (fc
            ? ` — case #${fc.index}: input=${JSON.stringify(fc.input)} expected=${JSON.stringify(fc.expected)} got=${fc.actual}`
            : "") +
          (res.compileOutput ? `\n${res.compileOutput}` : "")
      );
    }
  }

  console.log(`\n${PROBLEMS.length - failed}/${PROBLEMS.length} problems verified.`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
