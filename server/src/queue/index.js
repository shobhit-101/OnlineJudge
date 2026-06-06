"use strict";

// Submission queue — producer side (Step 14).
//
// A job carries ONLY the submissionId; the worker loads everything else (code,
// language, problem, test cases) from Mongo. This keeps the queue lightweight
// and the database the single source of truth.

const { getRedis, STREAM_KEY, closeRedis } = require("./redis");

/**
 * Push a submission job onto the stream.
 * @param {string} submissionId
 * @returns {Promise<string>} the generated stream entry id (e.g. "1700000000000-0")
 */
async function enqueueSubmission(submissionId) {
  const redis = getRedis();
  return redis.xadd(STREAM_KEY, "*", "submissionId", String(submissionId));
}

module.exports = { enqueueSubmission, STREAM_KEY, closeRedis };
