"use strict";

module.exports = {
  problem: {
    slug: "trapping-rain-water",
    title: "Trapping Rain Water",
    difficulty: "Hard",
    tags: ["array", "two-pointers", "dynamic-programming", "stack"],
    statement: [
      "Given `n` non-negative integers representing an elevation map where the",
      "width of each bar is `1`, compute how much water it can trap after raining.",
    ].join("\n"),
    constraints: ["1 ≤ height.length ≤ 2·10^4", "0 ≤ height[i] ≤ 10^5"],
    signature: {
      functionName: "trap",
      params: [{ name: "height", type: "int[]" }],
      returnType: "int",
    },
    starterCode: {
      cpp: `class Solution {
public:
    int trap(vector<int>& height) {

    }
};
`,
    },
  },

  testcases: [
    { isSample: true, input: [[0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]], expected: 6, explanation: "6 units of water are trapped between the bars." },
    { isSample: true, input: [[4, 2, 0, 3, 2, 5]], expected: 9 },
    { isSample: true, input: [[1, 2, 3]], expected: 0, explanation: "Strictly increasing traps nothing." },

    { isSample: false, input: [[3, 2, 1]], expected: 0 },
    { isSample: false, input: [[2, 0, 2]], expected: 2 },
    { isSample: false, input: [[5, 0, 5]], expected: 5 },
    { isSample: false, input: [[1, 0, 1, 0, 1]], expected: 2 },
    { isSample: false, input: [[0, 0, 0]], expected: 0 },
    { isSample: false, input: [[4, 2, 3]], expected: 1 },
    { isSample: false, input: [[5, 4, 1, 2]], expected: 1 },
  ],
};
