"use strict";

module.exports = {
  problem: {
    slug: "maximum-subarray",
    title: "Maximum Subarray",
    difficulty: "Medium",
    tags: ["array", "dynamic-programming", "divide-and-conquer"],
    statement: [
      "Given an integer array `nums`, find the contiguous subarray (containing at",
      "least one number) with the largest sum, and return **that sum**.",
    ].join("\n"),
    constraints: ["1 ≤ nums.length ≤ 10^5", "-10^4 ≤ nums[i] ≤ 10^4"],
    signature: {
      functionName: "maxSubArray",
      params: [{ name: "nums", type: "int[]" }],
      returnType: "int",
    },
    starterCode: {
      cpp: `class Solution {
public:
    int maxSubArray(vector<int>& nums) {

    }
};
`,
    },
  },

  testcases: [
    { isSample: true, input: [[-2, 1, -3, 4, -1, 2, 1, -5, 4]], expected: 6, explanation: "[4,-1,2,1] sums to 6." },
    { isSample: true, input: [[1]], expected: 1 },
    { isSample: true, input: [[5, 4, -1, 7, 8]], expected: 23 },

    { isSample: false, input: [[-1]], expected: -1 },
    { isSample: false, input: [[-2, -1]], expected: -1 },
    { isSample: false, input: [[-3, -2, -5]], expected: -2 },
    { isSample: false, input: [[1, 2, 3, 4]], expected: 10 },
    { isSample: false, input: [[-1, -2, -3, -4]], expected: -1 },
    { isSample: false, input: [[2, -1, 2, -1, 2]], expected: 4 },
    { isSample: false, input: [[-5, 4, -1, 7, 8, -10]], expected: 18 },
  ],
};
