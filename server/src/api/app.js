"use strict";

// Builds the Express app: middleware, routes, and error handling. Kept separate
// from the server bootstrap (src/index.js) so it can be created without listening.

const express = require("express");
const cors = require("cors");
const { healthRouter } = require("./routes/health");
const { problemsRouter } = require("./routes/problems");
const { notFound, errorHandler } = require("./middleware/errors");

function createApp() {
  const app = express();

  app.use(cors()); // frontend is a separate origin (Phase 4)
  app.use(express.json({ limit: "256kb" })); // submissions carry code; cap the body

  app.use("/health", healthRouter);
  app.use("/api/problems", problemsRouter);
  // More Phase-3 endpoints (submissions, SSE, …) mount here in later steps.

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
