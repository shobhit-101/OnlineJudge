"use strict";

// Submit / Run / fetch-submission endpoints. Submit and Run both validate, persist
// a queued submission, enqueue a job, and return its id immediately — the worker
// judges it asynchronously. The client polls GET /:id for the verdict (live SSE
// comes in Step 20).

const { Router } = require("express");
const mongoose = require("mongoose");
const { asyncHandler } = require("../middleware/asyncHandler");
const { Problem } = require("../../data/models");
const { createSubmission, getSubmission } = require("../../data/submissions");
const { enqueueSubmission } = require("../../queue/index.js");
const { supportedLanguages } = require("../../engine/index.js");

function badRequest(message) {
  const e = new Error(message);
  e.status = 400;
  return e;
}

function notFound(message) {
  const e = new Error(message);
  e.status = 404;
  return e;
}

// Shared handler for Submit (kind="submit") and Run (kind="run").
async function enqueueAndRespond(req, res, kind) {
  const { problemSlug, language, code } = req.body || {};

  if (!problemSlug || typeof problemSlug !== "string") throw badRequest("problemSlug is required");
  if (!supportedLanguages.includes(language)) {
    throw badRequest(`unsupported language (supported: ${supportedLanguages.join(", ")})`);
  }
  if (typeof code !== "string" || code.trim() === "") throw badRequest("code is required");

  const problem = await Problem.findOne({ slug: problemSlug }).select("_id").lean();
  if (!problem) throw badRequest(`unknown problem: ${problemSlug}`);

  const sub = await createSubmission({ problemId: problem._id, language, code, kind });
  await enqueueSubmission(sub._id);

  res.status(202).json({ submissionId: String(sub._id), status: sub.status, kind });
}

// Client-facing view of a submission (no internal fields).
function publicSubmission(s) {
  return {
    id: String(s._id),
    kind: s.kind,
    language: s.language,
    status: s.status,
    verdict: s.verdict,
    passed: s.passed,
    total: s.total,
    stats: s.stats,
    failedCase: s.failedCase,
    compileOutput: s.compileOutput,
    error: s.error,
    createdAt: s.createdAt,
  };
}

const submissionsRouter = Router();

// POST /api/submissions — official attempt (all test cases).
submissionsRouter.post(
  "/",
  asyncHandler((req, res) => enqueueAndRespond(req, res, "submit"))
);

// GET /api/submissions/:id — poll status/verdict.
submissionsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) throw notFound("submission not found");
    const s = await getSubmission(req.params.id);
    if (!s) throw notFound("submission not found");
    res.json({ submission: publicSubmission(s) });
  })
);

const runRouter = Router();

// POST /api/run — quick check against sample cases only (not an official attempt).
runRouter.post(
  "/",
  asyncHandler((req, res) => enqueueAndRespond(req, res, "run"))
);

module.exports = { submissionsRouter, runRouter };
