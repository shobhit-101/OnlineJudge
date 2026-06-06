"use strict";

// Step 14 demo: create a queued submission, enqueue a job for it, and read the
// stream back to confirm it landed. (Consuming happens in Step 15.)
// Run with: npm run -w @oj/server queue:demo

const { connect, disconnect } = require("../data/db");
const { Problem } = require("../data/models");
const { createSubmission } = require("../data/submissions");
const { enqueueSubmission, STREAM_KEY, closeRedis } = require("./index.js");
const { getRedis } = require("./redis");

const SOLUTION = `
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

async function main() {
  await connect();
  const problem = await Problem.findOne({ slug: "two-sum" }).lean();

  // Create a submission (queued), then enqueue a job referencing it.
  const sub = await createSubmission({ problemId: problem._id, language: "cpp", code: SOLUTION });
  const entryId = await enqueueSubmission(sub._id);
  console.log(`created submission ${sub._id} (status=${sub.status})`);
  console.log(`enqueued -> stream "${STREAM_KEY}" entry ${entryId}`);

  // Read the stream back to prove the job is there.
  const redis = getRedis();
  const length = await redis.xlen(STREAM_KEY);
  const last = await redis.xrevrange(STREAM_KEY, "+", "-", "COUNT", 1);
  console.log(`stream length: ${length}`);
  console.log("newest entry:", JSON.stringify(last));

  await closeRedis();
  await disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
