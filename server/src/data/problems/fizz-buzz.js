"use strict";

module.exports = {
  problem: {
    slug: "fizz-buzz",
    title: "Fizz Buzz",
    difficulty: "Easy",
    tags: ["math", "string", "simulation"],
    statement: [
      "Return a string array `answer` (1-indexed) of length `n`, where for each",
      "`i` from `1` to `n`:",
      "",
      "- `\"FizzBuzz\"` if `i` is divisible by both 3 and 5,",
      "- `\"Fizz\"` if `i` is divisible by 3,",
      "- `\"Buzz\"` if `i` is divisible by 5,",
      "- the decimal string of `i` otherwise.",
    ].join("\n"),
    constraints: ["1 ≤ n ≤ 10^4"],
    signature: {
      functionName: "fizzBuzz",
      params: [{ name: "n", type: "int" }],
      returnType: "string[]",
    },
    starterCode: {
      cpp: `class Solution {
public:
    vector<string> fizzBuzz(int n) {

    }
};
`,
    },
  },

  testcases: [
    { isSample: true, input: [3], expected: ["1", "2", "Fizz"], explanation: "3 is divisible by 3 → \"Fizz\"." },
    { isSample: true, input: [5], expected: ["1", "2", "Fizz", "4", "Buzz"] },
    { isSample: true, input: [15], expected: ["1", "2", "Fizz", "4", "Buzz", "Fizz", "7", "8", "Fizz", "Buzz", "11", "Fizz", "13", "14", "FizzBuzz"] },

    { isSample: false, input: [1], expected: ["1"] },
    { isSample: false, input: [2], expected: ["1", "2"] },
    { isSample: false, input: [4], expected: ["1", "2", "Fizz", "4"] },
    { isSample: false, input: [9], expected: ["1", "2", "Fizz", "4", "Buzz", "Fizz", "7", "8", "Fizz"] },
    { isSample: false, input: [12], expected: ["1", "2", "Fizz", "4", "Buzz", "Fizz", "7", "8", "Fizz", "Buzz", "11", "Fizz"] },
    { isSample: false, input: [16], expected: ["1", "2", "Fizz", "4", "Buzz", "Fizz", "7", "8", "Fizz", "Buzz", "11", "Fizz", "13", "14", "FizzBuzz", "16"] },
    { isSample: false, input: [20], expected: ["1", "2", "Fizz", "4", "Buzz", "Fizz", "7", "8", "Fizz", "Buzz", "11", "Fizz", "13", "14", "FizzBuzz", "16", "17", "Fizz", "19", "Buzz"] },
  ],
};
