"use strict";

module.exports = {
  problem: {
    slug: "valid-anagram",
    title: "Valid Anagram",
    difficulty: "Easy",
    tags: ["string", "hash-table", "sorting"],
    statement: [
      "Given two strings `s` and `t` of lowercase English letters, return `true`",
      "if `t` is an **anagram** of `s` (the same letters with the same counts),",
      "and `false` otherwise.",
    ].join("\n"),
    constraints: [
      "1 ≤ s.length, t.length ≤ 5·10^4",
      "s and t consist of lowercase English letters only.",
    ],
    signature: {
      functionName: "isAnagram",
      params: [
        { name: "s", type: "string" },
        { name: "t", type: "string" },
      ],
      returnType: "bool",
    },
    starterCode: {
      cpp: `class Solution {
public:
    bool isAnagram(string s, string t) {

    }
};
`,
    },
  },

  testcases: [
    { isSample: true, input: ["anagram", "nagaram"], expected: true, explanation: "Same letters, same counts." },
    { isSample: true, input: ["rat", "car"], expected: false },
    { isSample: true, input: ["a", "ab"], expected: false, explanation: "Different lengths can't be anagrams." },

    { isSample: false, input: ["ab", "ba"], expected: true },
    { isSample: false, input: ["aabb", "bbaa"], expected: true },
    { isSample: false, input: ["abc", "abd"], expected: false },
    { isSample: false, input: ["listen", "silent"], expected: true },
    { isSample: false, input: ["hello", "world"], expected: false },
    { isSample: false, input: ["aaa", "aaa"], expected: true },
    { isSample: false, input: ["abcd", "abce"], expected: false },
  ],
};
