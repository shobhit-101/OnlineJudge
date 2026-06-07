"use strict";

// Dashboard aggregates for a user, all derived from their submissions (no stored
// counters to drift). Simple find+reduce — fine at v1 scale; swap for aggregation
// pipelines if the data grows.

const { Submission, Problem } = require("./models");

async function getUserDashboard(userId) {
  // Solved = distinct problems with at least one AC (official) attempt.
  const acs = await Submission.find({ userId, kind: "submit", verdict: "AC" }, "problemId").lean();
  const solvedIds = [...new Set(acs.map((s) => String(s.problemId)))];

  const solvedProblems = await Problem.find({ _id: { $in: solvedIds } }, "difficulty").lean();
  const solvedByDifficulty = { Easy: 0, Medium: 0, Hard: 0 };
  for (const p of solvedProblems) {
    if (solvedByDifficulty[p.difficulty] !== undefined) solvedByDifficulty[p.difficulty]++;
  }

  // Recent activity = last 10 official attempts, with problem slug/title.
  const recent = await Submission.find({ userId, kind: "submit" })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();
  const recentIds = [...new Set(recent.map((s) => String(s.problemId)))];
  const probs = await Problem.find({ _id: { $in: recentIds } }, "slug title").lean();
  const probMap = Object.fromEntries(probs.map((p) => [String(p._id), { slug: p.slug, title: p.title }]));
  const recentActivity = recent.map((s) => ({
    id: String(s._id),
    problem: probMap[String(s.problemId)] || null,
    verdict: s.verdict,
    language: s.language,
    timeMs: s.stats ? s.stats.timeMs : null,
    createdAt: s.createdAt,
  }));

  // Heatmap = official attempts per UTC day -> { "YYYY-MM-DD": count }.
  const all = await Submission.find({ userId, kind: "submit" }, "createdAt").lean();
  const heatmap = {};
  for (const s of all) {
    const day = s.createdAt.toISOString().slice(0, 10);
    heatmap[day] = (heatmap[day] || 0) + 1;
  }

  return {
    totalSolved: solvedIds.length,
    solvedByDifficulty,
    recentActivity,
    heatmap,
  };
}

module.exports = { getUserDashboard };
