"use strict";

// Seeds problems + their test cases into MongoDB. Idempotent: upserts each
// problem by slug and replaces its test cases. Run with:
//   npm run -w @oj/server seed

const { connect, disconnect } = require("./db");
const { Problem, TestCase } = require("./models");

// NOTE: require the index explicitly — `require("./problems")` would resolve to the
// sibling file data/problems.js (the API data layer), not this directory's registry.
const PROBLEMS = require("./problems/index"); // registry of all problems

async function seed() {
  await connect();
  console.log("Connected to MongoDB.");

  for (const { problem, testcases } of PROBLEMS) {
    const doc = await Problem.findOneAndUpdate(
      { slug: problem.slug },
      { $set: problem },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await TestCase.deleteMany({ problemId: doc._id });
    await TestCase.insertMany(
      testcases.map((tc, i) => ({ ...tc, problemId: doc._id, index: i }))
    );

    const samples = testcases.filter((t) => t.isSample).length;
    console.log(
      `Seeded "${problem.title}" (${problem.slug}): ${testcases.length} test cases ` +
        `(${samples} sample, ${testcases.length - samples} hidden).`
    );
  }

  await disconnect();
  console.log("Done.");
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
