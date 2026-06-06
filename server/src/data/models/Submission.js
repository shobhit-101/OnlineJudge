"use strict";

// One attempt at a problem. Created as `queued`, moves to `running`, then `done`
// with a final verdict + stats. On failure we keep the failing case so the UI can
// show input / expected / actual side by side (spec 4.7).

const { mongoose } = require("../db");
const { Schema } = mongoose;

const FailedCaseSchema = new Schema(
  {
    index: { type: Number, default: null },
    input: { type: Schema.Types.Mixed, default: null },
    expected: { type: Schema.Types.Mixed, default: null },
    actual: { type: String, default: null },
  },
  { _id: false }
);

const SubmissionSchema = new Schema(
  {
    userId: { type: String, default: null, index: true }, // Clerk id (Phase 3)
    problemId: { type: Schema.Types.ObjectId, ref: "Problem", required: true, index: true },
    language: { type: String, enum: ["cpp", "python", "java"], required: true },
    code: { type: String, required: true },
    status: {
      type: String,
      // `error` = a system/infra failure while judging (not the user's fault),
      // e.g. a worker died repeatedly on this job (Step 16 dead-letter).
      enum: ["queued", "running", "done", "error"],
      default: "queued",
      index: true,
    },
    verdict: {
      type: String,
      enum: ["AC", "WA", "TLE", "MLE", "RE", "CE"],
      default: null,
    },
    error: { type: String, default: "" }, // system error message (status=error)
    compileOutput: { type: String, default: "" }, // compiler message on CE
    passed: { type: Number, default: null }, // test cases passed
    total: { type: Number, default: null }, // total test cases
    failedCase: { type: FailedCaseSchema, default: null },
    stats: {
      timeMs: { type: Number, default: null },
      memoryKb: { type: Number, default: null },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Submission", SubmissionSchema);
