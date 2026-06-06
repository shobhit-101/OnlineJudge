"use strict";

// Output comparator (DECISIONS 008): whitespace-normalized token comparison.
//
// Both the program's stdout and the serialized expected answer are reduced to a
// sequence of whitespace-delimited tokens and compared exactly. This absorbs
// trailing newlines, trailing spaces, and blank lines, while staying exact
// otherwise — no float tolerance, no reordering (every v1 problem has a single
// canonical answer, and v1 strings are whitespace-free tokens, so collapsing
// whitespace can never split a token).

function tokenize(text) {
  return text
    .replace(/\r\n/g, "\n")
    .trim()
    .split(/\s+/)
    .filter((t) => t.length > 0);
}

// True if `actual` matches `expected` under token normalization (AC-worthy).
function compareOutput(actual, expected) {
  const a = tokenize(actual);
  const e = tokenize(expected);
  if (a.length !== e.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== e[i]) return false;
  }
  return true;
}

module.exports = { compareOutput, tokenize };
