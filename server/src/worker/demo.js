"use strict";

// Step 15 demo: the full pipeline, headless. Enqueue submissions, then let the
// worker drain the queue, judge each, and persist the verdict. Read the final
// states back. Run with: npm run -w @oj/server worker:demo

const { connect, disconnect } = require("../data/db");
const { Problem } = require("../data/models");
const { createSubmission, getSubmission } = require("../data/submissions");
const { enqueueSubmission, closeRedis } = require("../queue/index.js");
const { createRedisClient } = require("../queue/redis");
const { ensureGroup, consumeOnce } = require("./index.js");

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

const WRONG = `
class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) { return {0, 0}; }
};
`;

async function main() {
  await connect();
  const problem = await Problem.findOne({ slug: "two-sum" }).lean();

  const redis = createRedisClient();
  await ensureGroup(redis);

  console.log("API side — enqueue submissions (returns instantly):");
  const tracked = [];
  for (const [label, code] of [["correct", CORRECT], ["wrong", WRONG]]) {
    const sub = await createSubmission({ problemId: problem._id, language: "cpp", code });
    await enqueueSubmission(sub._id);
    tracked.push({ label, id: String(sub._id) });
    console.log(`  enqueued ${label}: ${sub._id} (status=${sub.status})`);
  }

  console.log("\nWorker side — drain the queue and judge:");
  let job;
  while ((job = await consumeOnce(redis, "demo-worker", 2000))) {
    console.log(`  picked ${job.submissionId} -> verdict ${job.result ? job.result.verdict : "ERROR"}`);
  }

  console.log("\nFinal persisted states:");
  for (const t of tracked) {
    const s = await getSubmission(t.id);
    console.log(
      `  [${t.label}] status=${s.status} verdict=${s.verdict} ` +
        `passed=${s.passed}/${s.total} time=${s.stats.timeMs}ms mem=${s.stats.memoryKb}kb`
    );
  }

  await redis.quit();
  await closeRedis();
  await disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
