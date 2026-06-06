"use strict";

// Step 16 demo:
//   A) a pool of workers drains a burst in parallel (jobs shared across workers)
//   B) a job a "crashed" worker left pending gets reclaimed and retried
//   C) a job that keeps failing gets dead-lettered (status=error)
// Run with: npm run -w @oj/server pool:demo

const { connect, disconnect } = require("../data/db");
const { Problem } = require("../data/models");
const { createSubmission, getSubmission } = require("../data/submissions");
const { enqueueSubmission, closeRedis } = require("../queue/index.js");
const { createRedisClient, STREAM_KEY, GROUP } = require("../queue/redis");
const { ensureGroup, consumeOnce, reclaimStale } = require("./index.js");

const CORRECT = `
class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        unordered_map<int,int> seen;
        for (int i = 0; i < (int)nums.size(); ++i) {
            int need = target - nums[i];
            if (seen.count(need)) return {seen[need], i};
            seen[nums[i]] = i;
        }
        return {};
    }
};
`;

async function enqueue(problem, label) {
  const sub = await createSubmission({ problemId: problem._id, language: "cpp", code: CORRECT });
  await enqueueSubmission(sub._id);
  return { label, id: String(sub._id) };
}

// One worker draining until the stream is idle.
async function drain(consumer, counts) {
  const redis = createRedisClient();
  let job;
  while ((job = await consumeOnce(redis, consumer, 1200))) {
    counts[consumer] = (counts[consumer] || 0) + 1;
  }
  await redis.quit();
}

async function main() {
  await connect();
  const problem = await Problem.findOne({ slug: "two-sum" }).lean();
  const admin = createRedisClient();
  await ensureGroup(admin);

  // ---- Part A: pool drains a burst in parallel ----
  console.log("=== Part A: 3 workers drain a burst of 6 in parallel ===");
  for (let i = 0; i < 6; i++) await enqueue(problem, `b${i}`);
  const counts = {};
  const t0 = Date.now();
  await Promise.all([drain("w-0", counts), drain("w-1", counts), drain("w-2", counts)]);
  console.log(`drained ${Object.values(counts).reduce((a, b) => a + b, 0)} jobs in ${Date.now() - t0}ms`);
  console.log("jobs handled per worker:", counts);

  // ---- Part B: reclaim a job a crashed worker left pending ----
  console.log("\n=== Part B: reclaim a job a crashed worker left pending ===");
  const orphan = await enqueue(problem, "orphan");
  // A 'ghost' worker grabs the job but never acks (simulates a crash).
  await admin.xreadgroup("GROUP", GROUP, "ghost", "COUNT", 1, "STREAMS", STREAM_KEY, ">");
  console.log(`ghost grabbed ${orphan.id} then 'crashed' (never acked)`);
  console.log(`  before: status=${(await getSubmission(orphan.id)).status}`);
  const rescued = await reclaimStale(admin, "rescuer", { minIdleMs: 0, maxDeliveries: 3 });
  console.log("  reclaim:", rescued);
  const after = await getSubmission(orphan.id);
  console.log(`  after:  status=${after.status} verdict=${after.verdict}`);

  // ---- Part C: dead-letter a poison job ----
  console.log("\n=== Part C: dead-letter a job that exceeded its retries ===");
  const poison = await enqueue(problem, "poison");
  await admin.xreadgroup("GROUP", GROUP, "ghost", "COUNT", 1, "STREAMS", STREAM_KEY, ">");
  console.log(`ghost grabbed ${poison.id} then 'crashed'`);
  // maxDeliveries: 0 forces the dead-letter path immediately.
  const dl = await reclaimStale(admin, "rescuer", { minIdleMs: 0, maxDeliveries: 0 });
  console.log("  reclaim:", dl);
  const ps = await getSubmission(poison.id);
  console.log(`  poison: status=${ps.status} error="${ps.error}"`);

  await admin.quit();
  await closeRedis();
  await disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
