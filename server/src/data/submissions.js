"use strict";

// Submission persistence helpers — the queued -> running -> done lifecycle.
// The API (Phase 3) creates a submission; the worker (Step 15) marks it running,
// judges it, and completes it with the verdict + stats + failing case.

const { Submission } = require("./models");

// Create a new submission in the `queued` state.
async function createSubmission({ userId = null, problemId, language, code }) {
  return Submission.create({ userId, problemId, language, code, status: "queued" });
}

// Mark a submission as being judged.
async function setRunning(id) {
  return Submission.findByIdAndUpdate(id, { $set: { status: "running" } }, { new: true });
}

// Finalize a submission with a judge result:
//   { verdict, passed, total, compileOutput, failedCase, stats }
async function completeSubmission(id, result) {
  return Submission.findByIdAndUpdate(
    id,
    {
      $set: {
        status: "done",
        verdict: result.verdict,
        passed: result.passed ?? null,
        total: result.total ?? null,
        compileOutput: result.compileOutput || "",
        failedCase: result.failedCase || null,
        stats: result.stats || { timeMs: null, memoryKb: null },
      },
    },
    { new: true }
  );
}

// Mark a submission as failed due to a system/infra error (not the user's code).
async function failSubmission(id, reason) {
  return Submission.findByIdAndUpdate(
    id,
    { $set: { status: "error", error: String(reason).slice(0, 500) } },
    { new: true }
  );
}

async function getSubmission(id) {
  return Submission.findById(id);
}

// Newest-first history, optionally scoped by user and/or problem.
async function listSubmissions({ userId, problemId } = {}) {
  const q = {};
  if (userId) q.userId = userId;
  if (problemId) q.problemId = problemId;
  return Submission.find(q).sort({ createdAt: -1 });
}

module.exports = {
  createSubmission,
  setRunning,
  completeSubmission,
  failSubmission,
  getSubmission,
  listSubmissions,
};
