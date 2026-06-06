"use strict";

// Problem read helpers for the API. The detail query fetches ONLY sample test
// cases (isSample:true) — hidden cases are never read here, so they can't leak to
// a client (DECISIONS 010).

const { Problem, TestCase } = require("./models");

function acceptanceRate(stats) {
  if (!stats || !stats.totalSubmissions) return null;
  return Math.round((stats.acceptedSubmissions / stats.totalSubmissions) * 100);
}

// List view: lightweight fields + optional filters (difficulty, tag, title search).
async function listProblems({ difficulty, tag, q } = {}) {
  const query = {};
  if (difficulty) query.difficulty = difficulty;
  if (tag) query.tags = tag;
  if (q) query.title = { $regex: q, $options: "i" };

  const docs = await Problem.find(query, "slug title difficulty tags stats")
    .sort({ createdAt: 1 })
    .lean();

  return docs.map((p) => ({
    slug: p.slug,
    title: p.title,
    difficulty: p.difficulty,
    tags: p.tags,
    acceptanceRate: acceptanceRate(p.stats),
  }));
}

// Detail view: full statement + starter code + SAMPLE cases only.
async function getProblemBySlug(slug) {
  const p = await Problem.findOne({ slug }).lean();
  if (!p) return null;

  const samples = await TestCase.find({ problemId: p._id, isSample: true })
    .sort({ index: 1 })
    .lean();

  return {
    slug: p.slug,
    title: p.title,
    difficulty: p.difficulty,
    tags: p.tags,
    statement: p.statement,
    constraints: p.constraints,
    signature: p.signature,
    starterCode: p.starterCode,
    acceptanceRate: acceptanceRate(p.stats),
    samples: samples.map((s) => ({
      input: s.input,
      expected: s.expected,
      explanation: s.explanation,
    })),
  };
}

module.exports = { listProblems, getProblemBySlug };
