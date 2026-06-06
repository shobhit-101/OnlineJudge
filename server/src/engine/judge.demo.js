"use strict";

// Step 12 demo: judge several solutions against the real seeded Two Sum and print
// the verdict for each. Run with: npm run -w @oj/server judge:demo

const { connect, disconnect } = require("../data/db");
const { Problem, TestCase } = require("../data/models");
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
    vector<int> twoSum(vector<int>& nums, int target) {
        return {0, 0};   // always wrong
    }
};
`;

const COMPILE_ERROR = `
class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        this is not valid c++
    }
};
`;

const INFINITE_LOOP = `
class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        while (true) {}
        return {};
    }
};
`;

async function main() {
  await connect();
  const problem = await Problem.findOne({ slug: "two-sum" }).lean();
  const testcases = await TestCase.find({ problemId: problem._id }).sort({ index: 1 }).lean();

  const solutions = [
    ["correct", CORRECT],
    ["wrong (returns 0,0)", WRONG],
    ["compile error", COMPILE_ERROR],
    ["infinite loop", INFINITE_LOOP],
  ];

  for (const [label, code] of solutions) {
    const res = await judge({ language: "cpp", code, problem, testcases });
    console.log(
      `\n[${label}]\n  verdict=${res.verdict}  passed=${res.passed}/${res.total}  ` +
        `time=${res.stats.timeMs}ms  mem=${res.stats.memoryKb}kb`
    );
    if (res.verdict === "CE") {
      console.log("  compile: " + res.compileOutput.split("\n")[1]);
    }
    if (res.failedCase) {
      const fc = res.failedCase;
      console.log(
        `  failed on case #${fc.index}: input=${JSON.stringify(fc.input)} ` +
          `expected=${JSON.stringify(fc.expected)} actual=${JSON.stringify(fc.actual)}`
      );
    }
  }

  await disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
