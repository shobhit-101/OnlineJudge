"use strict";

module.exports = {
  problem: {
    slug: "move-zeroes",
    title: "Move Zeroes",
    difficulty: "Easy",
    tags: ["array", "two-pointers"],
    statement: [
      "Move all `0`s in `nums` to the end while keeping the **relative order** of",
      "the non-zero elements, and return the resulting array.",
    ].join("\n"),
    constraints: ["1 ≤ nums.length ≤ 10^4", "-2^31 ≤ nums[i] ≤ 2^31 - 1"],
    signature: {
      functionName: "moveZeroes",
      params: [{ name: "nums", type: "int[]" }],
      returnType: "int[]",
    },
    starterCode: {
      cpp: `class Solution {
public:
    vector<int> moveZeroes(vector<int>& nums) {

    }
};
`,
    },
  },

  testcases: [
    { isSample: true, input: [[0, 1, 0, 3, 12]], expected: [1, 3, 12, 0, 0], explanation: "Non-zeros keep order; zeros go last." },
    { isSample: true, input: [[0]], expected: [0] },
    { isSample: true, input: [[1, 2, 3]], expected: [1, 2, 3] },

    { isSample: false, input: [[0, 0, 1]], expected: [1, 0, 0] },
    { isSample: false, input: [[1, 0, 2, 0, 3]], expected: [1, 2, 3, 0, 0] },
    { isSample: false, input: [[0, 0, 0]], expected: [0, 0, 0] },
    { isSample: false, input: [[-1, 0, -2, 0]], expected: [-1, -2, 0, 0] },
    { isSample: false, input: [[5, 0, 0, 0, 5]], expected: [5, 5, 0, 0, 0] },
    { isSample: false, input: [[1, 2, 0, 0, 3, 0, 4]], expected: [1, 2, 3, 4, 0, 0, 0] },
    { isSample: false, input: [[0, -1, 0, -2, 0, -3]], expected: [-1, -2, -3, 0, 0, 0] },
  ],
};
