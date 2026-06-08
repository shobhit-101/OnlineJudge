"use strict";

module.exports = {
  problem: {
    slug: "edit-distance",
    title: "Edit Distance",
    difficulty: "Hard",
    tags: ["string", "dynamic-programming"],
    statement: [
      "Given two strings `word1` and `word2`, return the minimum number of",
      "operations required to convert `word1` into `word2`.",
      "",
      "The permitted operations are: **insert** a character, **delete** a",
      "character, or **replace** a character.",
    ].join("\n"),
    constraints: [
      "1 ≤ word1.length, word2.length ≤ 500",
      "word1 and word2 consist of lowercase English letters only.",
    ],
    signature: {
      functionName: "minDistance",
      params: [
        { name: "word1", type: "string" },
        { name: "word2", type: "string" },
      ],
      returnType: "int",
    },
    starterCode: {
      cpp: `class Solution {
public:
    int minDistance(string word1, string word2) {

    }
};
`,
    },
  },

  testcases: [
    { isSample: true, input: ["horse", "ros"], expected: 3, explanation: "horse → rorse → rose → ros." },
    { isSample: true, input: ["intention", "execution"], expected: 5 },
    { isSample: true, input: ["abc", "abc"], expected: 0 },

    { isSample: false, input: ["a", "b"], expected: 1 },
    { isSample: false, input: ["ab", "a"], expected: 1 },
    { isSample: false, input: ["a", "ab"], expected: 1 },
    { isSample: false, input: ["abcd", "abxd"], expected: 1 },
    { isSample: false, input: ["kitten", "sitting"], expected: 3 },
    { isSample: false, input: ["xyz", "abc"], expected: 3 },
    { isSample: false, input: ["aaaa", "aa"], expected: 2 },
  ],
};
