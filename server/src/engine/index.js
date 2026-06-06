"use strict";

// Engine public API. Holds the per-language harness strategies (DECISIONS 003:
// strategy interface so Python/Java are additive) and re-exports the shared
// serialization contract.

const cpp = require("./languages/cpp");
const { serializeInput, serializeExpected } = require("./serialize");
const { compareOutput } = require("./compare");

const strategies = { cpp };
const supportedLanguages = Object.keys(strategies);

function getStrategy(language) {
  const s = strategies[language];
  if (!s) throw new Error(`no engine strategy for language: ${language}`);
  return s;
}

module.exports = {
  getStrategy,
  supportedLanguages,
  serializeInput,
  serializeExpected,
  compareOutput,
};
