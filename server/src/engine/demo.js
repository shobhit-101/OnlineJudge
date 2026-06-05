"use strict";

// Step 10 demo: load the seeded Two Sum, assemble a C++ harness around a correct
// solution, and run the sample cases through the sandbox — proving the
// stdin(wire) -> call -> stdout(canonical) contract works end to end for one case.
// Run with: npm run -w @oj/server engine:demo

const { connect, disconnect } = require("../data/db");
const { Problem, TestCase } = require("../data/models");
const { getStrategy, serializeInput, serializeExpected } = require("./index.js");
const { runInSandbox } = require("../sandbox/index.js");

// A correct solution (the seeded starter is empty), as if a user wrote it.
const SOLUTION = `
class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        unordered_map<int,int> seen;
        for (int i = 0; i < (int)nums.size(); ++i) {
            int need = target - nums[i];
            if (seen.count(need)) return {seen[need], i};
            seen[nums[i]] = i;
        }
        return {};
    }
};
`;

async function main() {
  await connect();
  const problem = await Problem.findOne({ slug: "two-sum" }).lean();
  const cases = await TestCase.find({ problemId: problem._id }).sort({ index: 1 }).lean();

  const cpp = getStrategy("cpp");
  const harness = cpp.buildHarness({ signature: problem.signature, code: SOLUTION });

  console.log("===== ASSEMBLED HARNESS =====");
  console.log(harness);
  console.log("===== RUNNING SAMPLE CASES =====");

  for (const tc of cases.filter((c) => c.isSample)) {
    const stdin = serializeInput(tc.input, problem.signature.params);
    const expected = serializeExpected(tc.expected, problem.signature.returnType);
    const r = await runInSandbox({ language: "cpp", code: harness, input: stdin });
    const got = r.stdout.trim();
    console.log(
      `case#${tc.index}  input=${JSON.stringify(tc.input)}  stdin=${JSON.stringify(stdin)}\n` +
        `          got=${JSON.stringify(got)}  expected=${JSON.stringify(expected)}  ` +
        `${got === expected ? "MATCH" : "MISMATCH"}`
    );
  }

  await disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
