"use strict";

module.exports = {
  problem: {
    slug: "rotate-array",
    title: "Rotate Array",
    difficulty: "Medium",
    tags: ["array", "two-pointers", "math"],
    statement: [
      "Rotate the array `nums` to the **right** by `k` steps, where `k` is",
      "non-negative, and return the resulting array.",
    ].join("\n"),
    constraints: ["1 ≤ nums.length ≤ 10^5", "-2^31 ≤ nums[i] ≤ 2^31 - 1", "0 ≤ k ≤ 10^5"],
    signature: {
      functionName: "rotate",
      params: [
        { name: "nums", type: "int[]" },
        { name: "k", type: "int" },
      ],
      returnType: "int[]",
    },
    starterCode: {
      cpp: `class Solution {
public:
    vector<int> rotate(vector<int>& nums, int k) {

    }
};
`,
    },
  },

  testcases: [
    { isSample: true, input: [[1, 2, 3, 4, 5, 6, 7], 3], expected: [5, 6, 7, 1, 2, 3, 4], explanation: "The last 3 elements wrap to the front." },
    { isSample: true, input: [[-1, -100, 3, 99], 2], expected: [3, 99, -1, -100] },
    { isSample: true, input: [[1, 2], 3], expected: [2, 1], explanation: "k = 3 wraps to an effective shift of 1." },

    { isSample: false, input: [[1], 0], expected: [1] },
    { isSample: false, input: [[1, 2, 3], 0], expected: [1, 2, 3] },
    { isSample: false, input: [[1, 2, 3], 3], expected: [1, 2, 3] },
    { isSample: false, input: [[1, 2, 3, 4], 1], expected: [4, 1, 2, 3] },
    { isSample: false, input: [[1, 2, 3, 4], 6], expected: [3, 4, 1, 2] },
    { isSample: false, input: [[1, 2, 3, 4, 5], 5], expected: [1, 2, 3, 4, 5] },
    { isSample: false, input: [[7, 8, 9], 4], expected: [9, 7, 8] },
  ],
};
