"use strict";

// Step 13 demo: walk a submission through queued -> running -> done, persisting
// the verdict, and read it back. Run with: npm run -w @oj/server submission:demo

const { connect, disconnect } = require("../data/db");
const { Problem, TestCase } = require("../data/models");
const {
  createSubmission,
  setRunning,
  completeSubmission,
  getSubmission,
  listSubmissions,
} = require("../data/submissions");
const { judge } = require("./judge");

const CORRECT = `
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

const WRONG = `
class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) { return {0, 0}; }
};
`;

async function processOne(label, code, problem, testcases) {
  console.log(`\n=== ${label} ===`);

  // 1. queued
  const sub = await createSubmission({ problemId: problem._id, language: "cpp", code });
  console.log(`created ${sub._id}  status=${sub.status}`);

  // 2. running
  await setRunning(sub._id);
  console.log("status -> running");

  // 3. judge + 4. done
  const result = await judge({ language: "cpp", code, problem, testcases });
  await completeSubmission(sub._id, result);

  // 5. read back what was persisted
  const final = await getSubmission(sub._id);
  console.log("persisted:", {
    status: final.status,
    verdict: final.verdict,
    passed: `${final.passed}/${final.total}`,
    stats: { timeMs: final.stats.timeMs, memoryKb: final.stats.memoryKb },
    failedCase: final.failedCase
      ? { index: final.failedCase.index, expected: final.failedCase.expected, actual: final.failedCase.actual }
      : null,
  });
}

async function main() {
  await connect();
  const problem = await Problem.findOne({ slug: "two-sum" }).lean();
  const testcases = await TestCase.find({ problemId: problem._id }).sort({ index: 1 }).lean();

  await processOne("correct -> AC", CORRECT, problem, testcases);
  await processOne("wrong -> WA", WRONG, problem, testcases);

  const history = await listSubmissions({ problemId: problem._id });
  console.log(`\nTotal submissions stored for two-sum: ${history.length}`);

  await disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
