"use strict";

module.exports = {
  problem: {
    slug: "running-sum",
    title: "Running Sum of 1d Array",
    difficulty: "Easy",
    tags: ["array", "prefix-sum"],
    statement: [
      "Given an array `nums`, return its **running sum**, where",
      "`result[i] = nums[0] + nums[1] + ... + nums[i]`.",
    ].join("\n"),
    constraints: ["1 ≤ nums.length ≤ 1000", "-10^6 ≤ nums[i] ≤ 10^6"],
    signature: {
      functionName: "runningSum",
      params: [{ name: "nums", type: "int[]" }],
      returnType: "int[]",
    },
    starterCode: {
      cpp: `class Solution {
public:
    vector<int> runningSum(vector<int>& nums) {

    }
};
`,
    },
  },

  testcases: [
    { isSample: true, input: [[1, 2, 3, 4]], expected: [1, 3, 6, 10], explanation: "[1, 1+2, 1+2+3, 1+2+3+4]." },
    { isSample: true, input: [[1, 1, 1, 1, 1]], expected: [1, 2, 3, 4, 5] },
    { isSample: true, input: [[3, 1, 2, 10, 1]], expected: [3, 4, 6, 16, 17] },

    { isSample: false, input: [[1]], expected: [1] },
    { isSample: false, input: [[-1, -2, -3]], expected: [-1, -3, -6] },
    { isSample: false, input: [[0, 0, 0]], expected: [0, 0, 0] },
    { isSample: false, input: [[5, -5, 5, -5]], expected: [5, 0, 5, 0] },
    { isSample: false, input: [[100, 200, 300]], expected: [100, 300, 600] },
    { isSample: false, input: [[-10, 10, -10, 10]], expected: [-10, 0, -10, 0] },
    { isSample: false, input: [[2, 2, 2, 2, 2, 2]], expected: [2, 4, 6, 8, 10, 12] },
  ],
};
