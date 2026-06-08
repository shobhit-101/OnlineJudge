"use strict";

module.exports = {
  problem: {
    slug: "spiral-matrix",
    title: "Spiral Matrix",
    difficulty: "Medium",
    tags: ["array", "matrix", "simulation"],
    statement: [
      "Given an `m × n` matrix, return all of its elements in **spiral order**:",
      "starting at the top-left and moving clockwise (right, down, left, up),",
      "spiralling inward.",
    ].join("\n"),
    constraints: [
      "1 ≤ rows, cols ≤ 100",
      "Every row of `matrix` has the same length.",
      "-100 ≤ matrix[i][j] ≤ 100",
    ],
    signature: {
      functionName: "spiralOrder",
      params: [{ name: "matrix", type: "int[][]" }],
      returnType: "int[]",
    },
    starterCode: {
      cpp: `class Solution {
public:
    vector<int> spiralOrder(vector<vector<int>>& matrix) {

    }
};
`,
    },
  },

  testcases: [
    { isSample: true, input: [[[1, 2, 3], [4, 5, 6], [7, 8, 9]]], expected: [1, 2, 3, 6, 9, 8, 7, 4, 5], explanation: "Clockwise from the top-left, spiralling inward." },
    { isSample: true, input: [[[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12]]], expected: [1, 2, 3, 4, 8, 12, 11, 10, 9, 5, 6, 7] },
    { isSample: true, input: [[[1]]], expected: [1] },

    { isSample: false, input: [[[1, 2], [3, 4]]], expected: [1, 2, 4, 3] },
    { isSample: false, input: [[[1, 2, 3]]], expected: [1, 2, 3] },
    { isSample: false, input: [[[1], [2], [3]]], expected: [1, 2, 3] },
    { isSample: false, input: [[[1, 2], [3, 4], [5, 6]]], expected: [1, 2, 4, 6, 5, 3] },
    { isSample: false, input: [[[1, 2, 3], [4, 5, 6]]], expected: [1, 2, 3, 6, 5, 4] },
    { isSample: false, input: [[[7, 8, 9, 10], [11, 12, 13, 14]]], expected: [7, 8, 9, 10, 14, 13, 12, 11] },
    { isSample: false, input: [[[1, 2, 3, 4, 5]]], expected: [1, 2, 3, 4, 5] },
  ],
};
