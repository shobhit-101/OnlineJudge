"use strict";

// A coding problem. LeetCode-style: judged via a function signature (DECISIONS
// 003), so each problem carries the signature the harness (Step 10) wraps. Test
// cases live in their own collection (TestCase) and are never sent to clients.

const { mongoose } = require("../db");
const { Schema } = mongoose;

// One function parameter: a name and a v1 type string (e.g. "int", "int[]",
// "string", "bool", "int[][]"). Field literally named "type" -> nested form.
const ParamSchema = new Schema(
  {
    name: { type: String, required: true },
    type: { type: String, required: true },
  },
  { _id: false }
);

const SignatureSchema = new Schema(
  {
    functionName: { type: String, required: true },
    params: { type: [ParamSchema], default: [] },
    returnType: { type: String, required: true },
  },
  { _id: false }
);

const ProblemSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    difficulty: { type: String, enum: ["Easy", "Medium", "Hard"], required: true },
    tags: { type: [String], default: [] },
    statement: { type: String, required: true }, // markdown
    constraints: { type: [String], default: [] },
    signature: { type: SignatureSchema, required: true },
    starterCode: {
      cpp: { type: String, default: "" },
      python: { type: String, default: "" },
      java: { type: String, default: "" },
    },
    // Optional per-problem overrides of the sandbox defaults.
    limits: {
      timeMs: { type: Number, default: null },
      memoryMb: { type: Number, default: null },
    },
    // For the acceptance-rate display; maintained atomically in Phase 3.
    stats: {
      totalSubmissions: { type: Number, default: 0 },
      acceptedSubmissions: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Problem", ProblemSchema);
