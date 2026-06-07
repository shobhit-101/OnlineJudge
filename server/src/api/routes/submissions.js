"use strict";

// Submit / Run / fetch-submission endpoints. Submit and Run both validate, persist
// a queued submission, enqueue a job, and return its id immediately — the worker
// judges it asynchronously. The client polls GET /:id for the verdict (live SSE
// comes in Step 20).

const { Router } = require("express");
const mongoose = require("mongoose");
const { asyncHandler } = require("../middleware/asyncHandler");
const { requireAuth } = require("../middleware/auth");
const { Problem } = require("../../data/models");
const { createSubmission, getSubmission } = require("../../data/submissions");
const { enqueueSubmission } = require("../../queue/index.js");
const { createRedisClient } = require("../../queue/redis");
const { channelFor } = require("../../queue/progress");
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

  const sub = await createSubmission({
    userId: req.userId, // set by requireAuth
    problemId: problem._id,
    language,
    code,
    kind,
  });
  await enqueueSubmission(sub._id);

  res.status(202).json({ submissionId: String(sub._id), status: sub.status, kind });
}

// Terminal SSE event built from a finished submission doc.
function resultEvent(s) {
  return {
    type: "result",
    status: s.status,
    verdict: s.verdict,
    passed: s.passed,
    total: s.total,
    stats: s.stats,
    failedCase: s.failedCase,
    compileOutput: s.compileOutput,
    error: s.error,
  };
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

// POST /api/submissions — official attempt (all test cases). Must be signed in.
submissionsRouter.post(
  "/",
  requireAuth,
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

// GET /api/submissions/:id/stream — live progress via Server-Sent Events.
submissionsRouter.get(
  "/:id/stream",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) throw notFound("submission not found");
    if (!(await getSubmission(id))) throw notFound("submission not found");

    // Switch the connection into an SSE stream.
    res.set({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // don't let proxies buffer the stream
    });
    res.flushHeaders();

    const subscriber = createRedisClient();
    let closed = false;
    const heartbeat = setInterval(() => {
      if (!closed) res.write(": ping\n\n"); // keep idle connections alive
    }, 15000);
    const cleanup = () => {
      if (closed) return;
      closed = true;
      clearInterval(heartbeat);
      subscriber.quit().catch(() => {});
      res.end();
    };

    subscriber.on("message", (_channel, msg) => {
      if (closed) return;
      res.write(`data: ${msg}\n\n`);
      try {
        if (JSON.parse(msg).type === "result") cleanup();
      } catch {
        /* ignore malformed */
      }
    });
    req.on("close", cleanup);

    await subscriber.subscribe(channelFor(id));

    // Re-read after subscribing so we don't miss a result that landed in the gap.
    const current = await getSubmission(id);
    res.write(`data: ${JSON.stringify({ type: "status", status: current.status })}\n\n`);
    if (current.status === "done" || current.status === "error") {
      res.write(`data: ${JSON.stringify(resultEvent(current))}\n\n`);
      cleanup();
    }
  })
);

const runRouter = Router();

// POST /api/run — quick check against sample cases only. Must be signed in.
runRouter.post(
  "/",
  requireAuth,
  asyncHandler((req, res) => enqueueAndRespond(req, res, "run"))
);

module.exports = { submissionsRouter, runRouter };
