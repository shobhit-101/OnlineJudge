"use strict";

module.exports = {
  problem: {
    slug: "transpose-matrix",
    title: "Transpose Matrix",
    difficulty: "Easy",
    tags: ["array", "matrix"],
    statement: [
      "Return the **transpose** of the given matrix. The transpose flips the matrix",
      "over its main diagonal, swapping rows and columns: `result[j][i] = matrix[i][j]`.",
    ].join("\n"),
    constraints: [
      "1 ≤ rows, cols ≤ 1000",
      "Every row of `matrix` has the same length.",
      "-10^9 ≤ matrix[i][j] ≤ 10^9",
    ],
    signature: {
      functionName: "transpose",
      params: [{ name: "matrix", type: "int[][]" }],
      returnType: "int[][]",
    },
    starterCode: {
      cpp: `class Solution {
public:
    vector<vector<int>> transpose(vector<vector<int>>& matrix) {

    }
};
`,
    },
  },

  testcases: [
    { isSample: true, input: [[[1, 2, 3], [4, 5, 6]]], expected: [[1, 4], [2, 5], [3, 6]], explanation: "A 2×3 matrix becomes 3×2." },
    { isSample: true, input: [[[1, 2], [3, 4]]], expected: [[1, 3], [2, 4]] },
    { isSample: true, input: [[[1]]], expected: [[1]] },

    { isSample: false, input: [[[1, 2, 3]]], expected: [[1], [2], [3]] },
    { isSample: false, input: [[[1], [2], [3]]], expected: [[1, 2, 3]] },
    { isSample: false, input: [[[1, 2], [3, 4], [5, 6]]], expected: [[1, 3, 5], [2, 4, 6]] },
    { isSample: false, input: [[[0, 0], [0, 0]]], expected: [[0, 0], [0, 0]] },
    { isSample: false, input: [[[-1, -2], [-3, -4]]], expected: [[-1, -3], [-2, -4]] },
    { isSample: false, input: [[[1, 2, 3, 4]]], expected: [[1], [2], [3], [4]] },
    { isSample: false, input: [[[7, 8, 9], [10, 11, 12], [13, 14, 15]]], expected: [[7, 10, 13], [8, 11, 14], [9, 12, 15]] },
  ],
};
