"use strict";

// v1 type strings: scalars ("int", "long", "bool", "string") with optional "[]"
// suffixes for 1D/2D arrays (e.g. "int[]", "int[][]", "string[]"). DECISIONS 003
// limits v1 to these — no trees/linked-lists.

function isArrayType(type) {
  return type.endsWith("[]");
}

// One array dimension off: "int[][]" -> "int[]", "int[]" -> "int".
function elementType(type) {
  return type.slice(0, -2);
}

module.exports = { isArrayType, elementType };
