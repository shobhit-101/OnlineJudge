"use strict";

// First seeded problem. Statement in original wording. Single canonical answer
// (indices in increasing order) so exact-match judging applies (DECISIONS 008).

module.exports = {
  problem: {
    slug: "two-sum",
    title: "Two Sum",
    difficulty: "Easy",
    tags: ["array", "hash-table"],
    statement: [
      "Given an array of integers `nums` and an integer `target`, return the",
      "indices of the two numbers that add up to `target`.",
      "",
      "Each input has **exactly one** solution, and you may not use the same",
      "element twice. **Return the two indices in increasing order.**",
    ].join("\n"),
    constraints: [
      "2 ≤ nums.length ≤ 10^4",
      "-10^9 ≤ nums[i] ≤ 10^9",
      "-10^9 ≤ target ≤ 10^9",
      "Exactly one valid answer exists.",
    ],
    signature: {
      functionName: "twoSum",
      params: [
        { name: "nums", type: "int[]" },
        { name: "target", type: "int" },
      ],
      returnType: "int[]",
    },
    starterCode: {
      cpp: [
        "class Solution {",
        "public:",
        "    vector<int> twoSum(vector<int>& nums, int target) {",
        "        ",
        "    }",
        "};",
        "",
      ].join("\n"),
    },
  },

  // input = [nums, target] (signature order); expected = the returned indices.
  testcases: [
    // --- samples (shown on the problem page + used by Run) ---
    { isSample: true, input: [[2, 7, 11, 15], 9], expected: [0, 1], explanation: "nums[0] + nums[1] = 2 + 7 = 9, so the answer is [0, 1]." },
    { isSample: true, input: [[3, 2, 4], 6], expected: [1, 2], explanation: "nums[1] + nums[2] = 2 + 4 = 6." },
    { isSample: true, input: [[3, 3], 6], expected: [0, 1], explanation: "The same value at two different indices." },

    // --- hidden (used only by Submit) ---
    { isSample: false, input: [[1, 2], 3], expected: [0, 1] },
    { isSample: false, input: [[-1, -2, -3, -4, -5], -8], expected: [2, 4] },
    { isSample: false, input: [[0, 4, 3, 0], 0], expected: [0, 3] },
    { isSample: false, input: [[-3, 4, 3, 90], 0], expected: [0, 2] },
    { isSample: false, input: [[2, 5, 5, 11], 10], expected: [1, 2] },
    { isSample: false, input: [[5, 75, 25], 100], expected: [1, 2] },
    { isSample: false, input: [[-10, 7, 19, -5, 3], 14], expected: [2, 3] },
  ],
};
