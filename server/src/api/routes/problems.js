"use strict";

const { Router } = require("express");
const { asyncHandler } = require("../middleware/asyncHandler");
const { listProblems, getProblemBySlug } = require("../../data/problems");

const problemsRouter = Router();

// GET /api/problems?difficulty=Easy&tag=array&q=two
problemsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { difficulty, tag, q } = req.query;
    const problems = await listProblems({ difficulty, tag, q });
    res.json({ problems });
  })
);

// GET /api/problems/:slug
problemsRouter.get(
  "/:slug",
  asyncHandler(async (req, res) => {
    const problem = await getProblemBySlug(req.params.slug);
    if (!problem) {
      const err = new Error("problem not found");
      err.status = 404;
      throw err;
    }
    res.json({ problem });
  })
);

module.exports = { problemsRouter };
