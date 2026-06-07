"use strict";

// Submission worker — consumer side, with a pool and crash recovery (Steps 15-16).
//
// A consumer group lets many workers share one stream: each job goes to exactly
// one worker. When a worker reads a job it enters the group's Pending Entries List
// (PEL) until acked. If a worker dies mid-judge, its job is stuck in the PEL — so a
// reclaim loop periodically XCLAIMs jobs idle past a threshold and retries them,
// dead-lettering any that exceed a max delivery count (poison jobs).

const {
  createRedisClient,
  STREAM_KEY,
  GROUP,
} = require("../queue/redis");
const {
  getSubmission,
  setRunning,
  completeSubmission,
  failSubmission,
} = require("../data/submissions");
const { Problem, TestCase } = require("../data/models");
const { bumpProblemStats } = require("../data/problems");
const { judge } = require("../engine/judge");
const { publishProgress } = require("../queue/progress");

const publish = (id, event) => publishProgress(id, event).catch(() => {});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Create the consumer group if missing (idempotent). "0" => also pick up backlog.
async function ensureGroup(redis) {
  try {
    await redis.xgroup("CREATE", STREAM_KEY, GROUP, "0", "MKSTREAM");
  } catch (err) {
    if (!String(err.message).includes("BUSYGROUP")) throw err;
  }
}

// Judge one persisted submission and save the result (load -> running -> judge -> done).
async function processJob(submissionId) {
  const sub = await getSubmission(submissionId);
  if (!sub) throw new Error(`submission ${submissionId} not found`);

  await setRunning(sub._id);
  publish(submissionId, { type: "status", status: "running" });

  const problem = await Problem.findById(sub.problemId).lean();
  if (!problem) throw new Error(`problem ${sub.problemId} not found`);

  // "run" judges against sample cases only; "submit" against the full suite.
  const tcQuery =
    sub.kind === "run"
      ? { problemId: sub.problemId, isSample: true }
      : { problemId: sub.problemId };
  const testcases = await TestCase.find(tcQuery).sort({ index: 1 }).lean();

  const result = await judge({
    language: sub.language,
    code: sub.code,
    problem,
    testcases,
    onProgress: (event) => publish(submissionId, event),
  });
  const fresh = await completeSubmission(sub._id, result);
  // Count problem acceptance exactly once, only for official attempts that
  // actually transitioned to done (a retried/already-done job returns null).
  if (fresh && sub.kind === "submit") {
    await bumpProblemStats(sub.problemId, result.verdict === "AC").catch((e) =>
      console.error(`stats bump failed for ${sub.problemId}: ${e.message}`)
    );
  }
  publish(submissionId, {
    type: "result",
    status: "done",
    verdict: result.verdict,
    passed: result.passed,
    total: result.total,
    stats: result.stats,
    failedCase: result.failedCase,
    compileOutput: result.compileOutput,
  });
  return result;
}

// Stream entry fields arrive as a flat [f1, v1, f2, v2] array.
function fieldsToObject(arr) {
  const o = {};
  for (let i = 0; i + 1 < arr.length; i += 2) o[arr[i]] = arr[i + 1];
  return o;
}

// Block-read one new job, process it, ack it. Returns the job summary or null if idle.
async function consumeOnce(redis, consumer, blockMs = 5000) {
  const res = await redis.xreadgroup(
    "GROUP", GROUP, consumer,
    "COUNT", 1,
    "BLOCK", blockMs,
    "STREAMS", STREAM_KEY, ">"
  );
  if (!res) return null;

  const [entryId, fields] = res[0][1][0];
  const submissionId = fieldsToObject(fields).submissionId;

  let result = null;
  try {
    result = await processJob(submissionId);
  } catch (err) {
    // An exception here is an internal/infra failure (judge catches user-code
    // issues as CE/RE/etc.). Mark it errored so it doesn't sit at `running`.
    console.error(`job ${entryId} (submission ${submissionId}) failed: ${err.message}`);
    await failSubmission(submissionId, err.message).catch(() => {});
    publish(submissionId, { type: "result", status: "error", error: err.message });
  } finally {
    await redis.xack(STREAM_KEY, GROUP, entryId);
  }
  return { entryId, submissionId, result };
}

// Read the fields of a job, mark its submission errored, and ack it (give up).
async function deadLetter(redis, entryId, reason) {
  const rows = await redis.xrange(STREAM_KEY, entryId, entryId);
  if (rows && rows[0]) {
    const submissionId = fieldsToObject(rows[0][1]).submissionId;
    await failSubmission(submissionId, reason).catch(() => {});
    publish(submissionId, { type: "result", status: "error", error: reason });
  }
  await redis.xack(STREAM_KEY, GROUP, entryId);
}

// Reclaim jobs left pending (idle >= minIdleMs) by a crashed worker: retry them,
// or dead-letter ones delivered more than maxDeliveries times. Returns a summary.
async function reclaimStale(redis, consumer, { minIdleMs = 120000, maxDeliveries = 3, count = 10 } = {}) {
  const pending = await redis.xpending(STREAM_KEY, GROUP, "IDLE", minIdleMs, "-", "+", count);
  const actions = [];

  for (const entry of pending) {
    const entryId = entry[0];
    const deliveries = Number(entry[3]);

    if (deliveries > maxDeliveries) {
      await deadLetter(redis, entryId, `exceeded ${maxDeliveries} retries`);
      actions.push({ entryId, action: "dead-letter" });
      continue;
    }

    // Take ownership (only if still idle >= minIdleMs — guards against stealing a
    // job another worker just grabbed).
    const claimed = await redis.xclaim(STREAM_KEY, GROUP, consumer, minIdleMs, entryId);
    if (!claimed || claimed.length === 0) continue;

    const submissionId = fieldsToObject(claimed[0][1]).submissionId;
    try {
      const result = await processJob(submissionId);
      actions.push({ entryId, submissionId, action: "retried", verdict: result.verdict });
    } catch (err) {
      await failSubmission(submissionId, err.message).catch(() => {});
      actions.push({ entryId, submissionId, action: "retry-failed" });
    } finally {
      await redis.xack(STREAM_KEY, GROUP, entryId);
    }
  }
  return actions;
}

// ---- pool ----

let shuttingDown = false;
function installShutdown() {
  const stop = () => {
    shuttingDown = true;
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

// One worker: its own connection, loops consuming jobs until shutdown.
async function workerLoop(consumer, blockMs) {
  const redis = createRedisClient();
  try {
    while (!shuttingDown) {
      try {
        const job = await consumeOnce(redis, consumer, blockMs);
        if (job && job.result) {
          console.log(
            `[${consumer}] submission ${job.submissionId} -> ${job.result.verdict} ` +
              `(${job.result.passed}/${job.result.total})`
          );
        }
      } catch (err) {
        console.error(`[${consumer}] loop error: ${err.message}`);
      }
    }
  } finally {
    await redis.quit();
  }
}

// Periodically reclaims stale jobs from crashed workers until shutdown.
async function reclaimLoop({ consumer, minIdleMs, maxDeliveries, everyMs }) {
  const redis = createRedisClient();
  try {
    while (!shuttingDown) {
      try {
        const actions = await reclaimStale(redis, consumer, { minIdleMs, maxDeliveries });
        for (const a of actions) console.log(`[reclaim] ${a.entryId} -> ${a.action}`);
      } catch (err) {
        console.error(`[reclaim] error: ${err.message}`);
      }
      await sleep(everyMs);
    }
  } finally {
    await redis.quit();
  }
}

// Start a pool of `size` workers + one reclaim loop. Resolves when shut down.
async function startPool({
  size = 4,
  blockMs = 5000,
  minIdleMs = 120000,
  maxDeliveries = 3,
  reclaimEveryMs = 30000,
} = {}) {
  const admin = createRedisClient();
  await ensureGroup(admin);
  await admin.quit();

  installShutdown();
  console.log(`worker pool starting: ${size} workers (group "${GROUP}", stream "${STREAM_KEY}")`);

  const loops = [];
  for (let i = 0; i < size; i++) {
    loops.push(workerLoop(`worker-${process.pid}-${i}`, blockMs));
  }
  loops.push(
    reclaimLoop({
      consumer: `reclaimer-${process.pid}`,
      minIdleMs,
      maxDeliveries,
      everyMs: reclaimEveryMs,
    })
  );

  await Promise.all(loops);
  console.log("worker pool stopped.");
}

module.exports = {
  ensureGroup,
  processJob,
  consumeOnce,
  reclaimStale,
  startPool,
};
