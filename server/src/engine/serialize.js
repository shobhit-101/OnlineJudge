"use strict";

// The language-agnostic I/O contract for LeetCode-style judging. Every language's
// harness reads the same INPUT wire format and prints the same canonical OUTPUT
// format, so judging and comparison don't care which language ran.
//
// INPUT wire format (whitespace-delimited, so a C++ `cin >>` reads it directly):
//   scalar int/long : the number            e.g. 9
//   bool            : 1 or 0
//   string          : a whitespace-free token
//   array T[]       : <count> <elem> <elem>  e.g. [2,7,11] -> "3 2 7 11"
//   array T[][]     : <rows> then each row as a T[]
//
// OUTPUT canonical format (compact, no spaces, exact-match comparable):
//   scalar          : 7
//   bool            : true / false
//   string          : the raw string
//   array           : [a,b,c]   2D: [[..],[..]]

const { isArrayType, elementType } = require("./types");

// --- INPUT: structured value -> stdin wire text ---
function wireValue(value, type) {
  if (isArrayType(type)) {
    const et = elementType(type);
    return [value.length, ...value.map((v) => wireValue(v, et))].join(" ");
  }
  if (type === "bool") return value ? "1" : "0";
  return String(value);
}

// Serialize the full argument list (values in signature-param order) for stdin.
function serializeInput(values, params) {
  return params.map((p, i) => wireValue(values[i], p.type)).join("\n");
}

// --- OUTPUT: structured value -> canonical text (matches every harness's print) ---
function canonValue(value, type) {
  if (isArrayType(type)) {
    const et = elementType(type);
    return "[" + value.map((v) => canonValue(v, et)).join(",") + "]";
  }
  if (type === "bool") return value ? "true" : "false";
  return String(value);
}

// Serialize a problem's expected return value to compare against program output.
function serializeExpected(value, returnType) {
  return canonValue(value, returnType);
}

module.exports = { serializeInput, serializeExpected };
