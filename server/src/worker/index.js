"use strict";

// Submission worker — consumer side (Step 15).
//
// Reads jobs from the Redis stream via a consumer group, judges each submission,
// and persists the verdict. A consumer group means a whole POOL of workers can
// share one stream: each job is delivered to exactly one worker, and unacked jobs
// stay in the group's pending list so a crashed worker's job can be reclaimed
// (Step 16).

const { createRedisClient, STREAM_KEY, GROUP } = require("../queue/redis");
const { getSubmission, setRunning, completeSubmission } = require("../data/submissions");
const { Problem, TestCase } = require("../data/models");
const { judge } = require("../engine/judge");

// Create the consumer group if it doesn't exist (idempotent). "0" = the group
// also picks up any jobs already on the stream; MKSTREAM creates the stream.
async function ensureGroup(redis) {
  try {
    await redis.xgroup("CREATE", STREAM_KEY, GROUP, "0", "MKSTREAM");
  } catch (err) {
    if (!String(err.message).includes("BUSYGROUP")) throw err; // already exists -> fine
  }
}

// Judge one persisted submission and save the result. The reusable orchestration
// (load -> running -> judge -> done) used by the worker loop.
async function processJob(submissionId) {
  const sub = await getSubmission(submissionId);
  if (!sub) throw new Error(`submission ${submissionId} not found`);

  await setRunning(sub._id);

  const problem = await Problem.findById(sub.problemId).lean();
  if (!problem) throw new Error(`problem ${sub.problemId} not found`);
  const testcases = await TestCase.find({ problemId: sub.problemId }).sort({ index: 1 }).lean();

  const result = await judge({ language: sub.language, code: sub.code, problem, testcases });
  await completeSubmission(sub._id, result);
  return result;
}

// Stream entry fields arrive as a flat [f1, v1, f2, v2] array.
function fieldsToObject(arr) {
  const o = {};
  for (let i = 0; i + 1 < arr.length; i += 2) o[arr[i]] = arr[i + 1];
  return o;
}

// Block-read one job, process it, ack it. Returns { entryId, submissionId, result }
// or null if the read timed out with no job (idle).
async function consumeOnce(redis, consumer, blockMs = 5000) {
  const res = await redis.xreadgroup(
    "GROUP", GROUP, consumer,
    "COUNT", 1,
    "BLOCK", blockMs,
    "STREAMS", STREAM_KEY, ">"
  );
  if (!res) return null;

  const entries = res[0][1];
  const [entryId, fields] = entries[0];
  const submissionId = fieldsToObject(fields).submissionId;

  let result = null;
  try {
    result = await processJob(submissionId);
  } catch (err) {
    console.error(`job ${entryId} (submission ${submissionId}) failed: ${err.message}`);
  } finally {
    // Ack so the job leaves the pending list. (Step 16 revisits retry/reclaim.)
    await redis.xack(STREAM_KEY, GROUP, entryId);
  }
  return { entryId, submissionId, result };
}

// Long-running worker loop (production entry). Ctrl-C / SIGTERM to stop.
async function startWorker({ consumer = `worker-${process.pid}`, blockMs = 5000 } = {}) {
  const redis = createRedisClient();
  await ensureGroup(redis);
  console.log(`worker "${consumer}" listening on "${STREAM_KEY}" (group "${GROUP}")...`);

  let running = true;
  const stop = () => {
    running = false;
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);

  while (running) {
    try {
      const job = await consumeOnce(redis, consumer, blockMs);
      if (job && job.result) {
        console.log(
          `judged submission ${job.submissionId} -> ${job.result.verdict} ` +
            `(${job.result.passed}/${job.result.total})`
        );
      }
    } catch (err) {
      console.error("worker loop error:", err.message);
    }
  }

  await redis.quit();
  console.log("worker stopped.");
}

module.exports = { ensureGroup, processJob, consumeOnce, startWorker };
