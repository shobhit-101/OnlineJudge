"use strict";

// Builds the Express app: middleware, routes, and error handling. Kept separate
// from the server bootstrap (src/index.js) so it can be created without listening.

require("../config"); // ensure server/.env is loaded before Clerk reads its keys

const express = require("express");
const cors = require("cors");
const { clerkMiddleware } = require("@clerk/express");
const { healthRouter } = require("./routes/health");
const { problemsRouter } = require("./routes/problems");
const { submissionsRouter, runRouter } = require("./routes/submissions");
const { profileRouter } = require("./routes/profile");
const { notFound, errorHandler } = require("./middleware/errors");

function createApp() {
  const app = express();

  app.use(cors()); // frontend is a separate origin (Phase 4)
  app.use(express.json({ limit: "256kb" })); // submissions carry code; cap the body
  app.use(clerkMiddleware()); // attaches auth from the session token (non-blocking)

  app.use("/health", healthRouter);
  app.use("/api/problems", problemsRouter);
  app.use("/api/submissions", submissionsRouter);
  app.use("/api/run", runRouter);
  app.use("/api/profile", profileRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
