"use strict";

// Throughput + verdict-latency benchmark for the judging pipeline under concurrency.
// Judges a fixed (problem, known-correct solution) many times with a bounded number
// of judges in flight, at several concurrency levels, and reports per-judge latency
// (mean / p50 / p95 / max) and aggregate throughput (submissions/sec).
//
// What it measures: the DOMINANT cost — the Docker-sandboxed compile + run (cold
// container per submission, DECISIONS 004). The Redis queue (sub-millisecond
// XADD/XACK) and Mongo persistence (~tens of ms) are negligible beside a
// seconds-scale judge, so a concurrency-bounded pool of judge() calls is a faithful
// ceiling for the worker pool (which is itself N async loops each calling judge()).
//
// Needs Docker + the oj-cpp-runner image. No Mongo/Redis. Run:
//   npm run -w @oj/server benchmark
//   $env:OJ_BENCH_N=24; $env:OJ_BENCH_LEVELS="1,2,4,8"; npm run -w @oj/server benchmark

const { judge } = require("../engine/judge");
const { problem, testcases } = require("../data/problems/two-sum");
const SOLUTIONS = require("../data/problems/_solutions");

const N = Number(process.env.OJ_BENCH_N || 15);
const LEVELS = (process.env.OJ_BENCH_LEVELS || "1,2,4")
  .split(",")
  .map((s) => Number(s.trim()))
  .filter((n) => n > 0);
const CODE = SOLUTIONS["two-sum"];

async function runOne() {
  const t0 = Date.now();
  const res = await judge({ language: "cpp", code: CODE, problem, testcases });
  if (res.verdict !== "AC") throw new Error(`unexpected verdict: ${res.verdict}`);
  return Date.now() - t0;
}

// Run `n` judges with at most `concurrency` in flight (mirrors the worker pool:
// `concurrency` async loops pulling from a shared queue). Returns latencies + wall.
async function runPool(n, concurrency) {
  const latencies = [];
  let next = 0;
  async function loop() {
    for (let i = next++; i < n; i = next++) {
      latencies.push(await runOne());
    }
  }
  const start = Date.now();
  await Promise.all(Array.from({ length: concurrency }, loop));
  return { latencies, wall: Date.now() - start };
}

function pct(sorted, p) {
  if (sorted.length === 0) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}

async function main() {
  console.log(
    `Benchmark: judging "${problem.slug}" (${testcases.length} cases) ` +
      `x ${N} submissions per level; concurrency = ${LEVELS.join(", ")}.`
  );

  process.stdout.write("warming up (1 untimed judge)… ");
  await runOne();
  console.log("done.\n");

  const rows = [];
  for (const c of LEVELS) {
    const { latencies, wall } = await runPool(N, c);
    const sorted = [...latencies].sort((a, b) => a - b);
    const mean = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const row = {
      c,
      throughput: (N / wall) * 1000,
      mean,
      p50: pct(sorted, 50),
      p95: pct(sorted, 95),
      max: sorted[sorted.length - 1],
      wall,
    };
    rows.push(row);
    console.log(
      `concurrency ${c}: ${(wall / 1000).toFixed(1)}s wall · ` +
        `${row.throughput.toFixed(2)} subs/s · latency mean ${mean.toFixed(0)} ` +
        `p50 ${row.p50} p95 ${row.p95} max ${row.max} ms`
    );
  }

  console.log(
    "\n| Concurrency | Throughput (subs/s) | Mean (ms) | p50 (ms) | p95 (ms) | Max (ms) | Wall (s) |"
  );
  console.log("|---|---|---|---|---|---|---|");
  for (const r of rows) {
    console.log(
      `| ${r.c} | ${r.throughput.toFixed(2)} | ${r.mean.toFixed(0)} | ${r.p50} | ${r.p95} | ${r.max} | ${(r.wall / 1000).toFixed(1)} |`
    );
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
