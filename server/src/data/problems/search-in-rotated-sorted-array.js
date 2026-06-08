"use strict";

module.exports = {
  problem: {
    slug: "search-in-rotated-sorted-array",
    title: "Search in Rotated Sorted Array",
    difficulty: "Medium",
    tags: ["array", "binary-search"],
    statement: [
      "`nums` is an ascending array of **distinct** integers that has been rotated",
      "at an unknown pivot. Given `target`, return its index, or `-1` if it is not",
      "present.",
      "",
      "Aim for `O(log n)` time.",
    ].join("\n"),
    constraints: [
      "1 ≤ nums.length ≤ 5000",
      "-10^4 ≤ nums[i], target ≤ 10^4",
      "All values in nums are distinct.",
    ],
    signature: {
      functionName: "search",
      params: [
        { name: "nums", type: "int[]" },
        { name: "target", type: "int" },
      ],
      returnType: "int",
    },
    starterCode: {
      cpp: `class Solution {
public:
    int search(vector<int>& nums, int target) {

    }
};
`,
    },
  },

  testcases: [
    { isSample: true, input: [[4, 5, 6, 7, 0, 1, 2], 0], expected: 4, explanation: "0 is at index 4." },
    { isSample: true, input: [[4, 5, 6, 7, 0, 1, 2], 3], expected: -1 },
    { isSample: true, input: [[1], 0], expected: -1 },

    { isSample: false, input: [[1], 1], expected: 0 },
    { isSample: false, input: [[1, 3], 3], expected: 1 },
    { isSample: false, input: [[5, 1, 3], 5], expected: 0 },
    { isSample: false, input: [[4, 5, 6, 7, 0, 1, 2], 4], expected: 0 },
    { isSample: false, input: [[4, 5, 6, 7, 0, 1, 2], 2], expected: 6 },
    { isSample: false, input: [[6, 7, 0, 1, 2, 4, 5], 1], expected: 3 },
    { isSample: false, input: [[3, 1], 1], expected: 1 },
  ],
};
