"use strict";

module.exports = {
  problem: {
    slug: "contains-duplicate",
    title: "Contains Duplicate",
    difficulty: "Easy",
    tags: ["array", "hash-table"],
    statement: [
      "Return `true` if any value appears **at least twice** in `nums`, and",
      "`false` if every element is distinct.",
    ].join("\n"),
    constraints: ["1 ≤ nums.length ≤ 10^5", "-10^9 ≤ nums[i] ≤ 10^9"],
    signature: {
      functionName: "containsDuplicate",
      params: [{ name: "nums", type: "int[]" }],
      returnType: "bool",
    },
    starterCode: {
      cpp: `class Solution {
public:
    bool containsDuplicate(vector<int>& nums) {

    }
};
`,
    },
  },

  testcases: [
    { isSample: true, input: [[1, 2, 3, 1]], expected: true, explanation: "1 appears twice." },
    { isSample: true, input: [[1, 2, 3, 4]], expected: false },
    { isSample: true, input: [[1, 1, 1, 3, 3, 4, 3, 2, 4, 2]], expected: true },

    { isSample: false, input: [[1]], expected: false },
    { isSample: false, input: [[2, 2]], expected: true },
    { isSample: false, input: [[-1, -2, -3, -1]], expected: true },
    { isSample: false, input: [[0, 1, 2, 3, 4, 5]], expected: false },
    { isSample: false, input: [[5, 5, 5, 5]], expected: true },
    { isSample: false, input: [[10, 20, 30, 40, 50, 60]], expected: false },
    { isSample: false, input: [[-1000000000, 1000000000, 0]], expected: false },
  ],
};
