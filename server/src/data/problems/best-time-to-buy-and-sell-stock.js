"use strict";

module.exports = {
  problem: {
    slug: "best-time-to-buy-and-sell-stock",
    title: "Best Time to Buy and Sell Stock",
    difficulty: "Easy",
    tags: ["array", "dynamic-programming"],
    statement: [
      "`prices[i]` is the price of a given stock on day `i`. Choose a single day",
      "to buy and a **different, later** day to sell.",
      "",
      "Return the maximum profit you can achieve, or `0` if no profit is possible.",
    ].join("\n"),
    constraints: ["1 ≤ prices.length ≤ 10^5", "0 ≤ prices[i] ≤ 10^4"],
    signature: {
      functionName: "maxProfit",
      params: [{ name: "prices", type: "int[]" }],
      returnType: "int",
    },
    starterCode: {
      cpp: `class Solution {
public:
    int maxProfit(vector<int>& prices) {

    }
};
`,
    },
  },

  testcases: [
    { isSample: true, input: [[7, 1, 5, 3, 6, 4]], expected: 5, explanation: "Buy at 1, sell at 6 → profit 5." },
    { isSample: true, input: [[7, 6, 4, 3, 1]], expected: 0, explanation: "Prices only fall; no profit." },
    { isSample: true, input: [[2, 4, 1]], expected: 2 },

    { isSample: false, input: [[1, 2]], expected: 1 },
    { isSample: false, input: [[2, 1]], expected: 0 },
    { isSample: false, input: [[3, 3, 3, 3]], expected: 0 },
    { isSample: false, input: [[1, 2, 3, 4, 5]], expected: 4 },
    { isSample: false, input: [[2, 1, 2, 1, 0, 1, 2]], expected: 2 },
    { isSample: false, input: [[100, 180, 260, 310, 40, 535, 695]], expected: 655 },
    { isSample: false, input: [[6]], expected: 0 },
  ],
};
