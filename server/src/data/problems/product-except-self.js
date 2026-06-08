"use strict";

module.exports = {
  problem: {
    slug: "product-except-self",
    title: "Product of Array Except Self",
    difficulty: "Medium",
    tags: ["array", "prefix-sum"],
    statement: [
      "Return an array `result` such that `result[i]` is the product of all the",
      "elements of `nums` **except** `nums[i]`.",
      "",
      "Solve it **without using division**. Each product is guaranteed to fit in a",
      "32-bit integer.",
    ].join("\n"),
    constraints: ["2 ≤ nums.length ≤ 10^5", "-30 ≤ nums[i] ≤ 30"],
    signature: {
      functionName: "productExceptSelf",
      params: [{ name: "nums", type: "int[]" }],
      returnType: "int[]",
    },
    starterCode: {
      cpp: `class Solution {
public:
    vector<int> productExceptSelf(vector<int>& nums) {

    }
};
`,
    },
  },

  testcases: [
    { isSample: true, input: [[1, 2, 3, 4]], expected: [24, 12, 8, 6], explanation: "result[0]=2·3·4=24, etc." },
    { isSample: true, input: [[-1, 1, 0, -3, 3]], expected: [0, 0, 9, 0, 0] },
    { isSample: true, input: [[2, 3, 4]], expected: [12, 8, 6] },

    { isSample: false, input: [[1, 1]], expected: [1, 1] },
    { isSample: false, input: [[0, 0]], expected: [0, 0] },
    { isSample: false, input: [[5, 2]], expected: [2, 5] },
    { isSample: false, input: [[1, 2, 3, 4, 5]], expected: [120, 60, 40, 30, 24] },
    { isSample: false, input: [[-1, -2, -3]], expected: [6, 3, 2] },
    { isSample: false, input: [[3, 0, 2]], expected: [0, 6, 0] },
    { isSample: false, input: [[2, 2, 2, 2]], expected: [8, 8, 8, 8] },
  ],
};
