"use strict";

module.exports = {
  problem: {
    slug: "single-number",
    title: "Single Number",
    difficulty: "Easy",
    tags: ["array", "bit-manipulation"],
    statement: [
      "Every element appears **exactly twice** except for one element, which",
      "appears once. Return that single element.",
      "",
      "Aim for linear time and constant extra space.",
    ].join("\n"),
    constraints: [
      "1 ≤ nums.length < 10^4",
      "nums.length is odd",
      "-3·10^4 ≤ nums[i] ≤ 3·10^4",
      "Every element appears exactly twice except for one.",
    ],
    signature: {
      functionName: "singleNumber",
      params: [{ name: "nums", type: "int[]" }],
      returnType: "int",
    },
    starterCode: {
      cpp: `class Solution {
public:
    int singleNumber(vector<int>& nums) {

    }
};
`,
    },
  },

  testcases: [
    { isSample: true, input: [[2, 2, 1]], expected: 1, explanation: "2 appears twice; 1 appears once." },
    { isSample: true, input: [[4, 1, 2, 1, 2]], expected: 4 },
    { isSample: true, input: [[1]], expected: 1 },

    { isSample: false, input: [[7, 3, 3]], expected: 7 },
    { isSample: false, input: [[-1, -1, -2]], expected: -2 },
    { isSample: false, input: [[0, 1, 0]], expected: 1 },
    { isSample: false, input: [[8, 8, 9]], expected: 9 },
    { isSample: false, input: [[100, 200, 100]], expected: 200 },
    { isSample: false, input: [[-5, -5, -7, -7, 3]], expected: 3 },
    { isSample: false, input: [[1, 2, 3, 1, 2]], expected: 3 },
  ],
};
