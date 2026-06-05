"use strict";

// A single test case for a problem, in its own collection so large hidden suites
// don't bloat the problem document and are never accidentally sent to clients
// (DECISIONS 010). `isSample` cases are shown on the problem page and used by
// "Run"; the rest are hidden and used only by "Submit".
//
// `input` is the array of argument values in signature order (e.g. for
// twoSum(nums, target): [[2,7,11,15], 9]); `expected` is the return value
// (e.g. [0,1]). Both are stored as structured JSON; the harness serializes them.

const { mongoose } = require("../db");
const { Schema } = mongoose;

const TestCaseSchema = new Schema(
  {
    problemId: { type: Schema.Types.ObjectId, ref: "Problem", required: true, index: true },
    index: { type: Number, required: true }, // ordering within the problem
    isSample: { type: Boolean, default: false },
    input: { type: Schema.Types.Mixed, required: true },
    expected: { type: Schema.Types.Mixed, required: true },
    explanation: { type: String, default: "" }, // samples only
  },
  { timestamps: true }
);

module.exports = mongoose.model("TestCase", TestCaseSchema);
