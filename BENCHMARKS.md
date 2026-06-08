# Benchmarks

Throughput and verdict-latency of the judging pipeline under concurrent load. These
numbers back the "self-built queue + worker pool" performance story and, per
DECISIONS 004, establish the **cold-container-per-submission baseline** against which
a future warm pool would be measured.

## What's measured

Each "submission" is a full judge of **Two Sum** (10 test cases) with a known-correct
C++ solution: build the harness → compile once in a fresh Docker sandbox → run all 10
cases in that container → produce a verdict (Steps 4, 10, 12). The harness runs `N`
such judges with a bounded number **in flight** at a time — the same shape as the
worker pool (`WORKER_CONCURRENCY` async loops, DECISIONS 020).

This deliberately measures the **dominant cost**: the Docker-sandboxed compile + run.
The Redis queue (sub-millisecond `XADD`/`XACK`) and Mongo persistence (~tens of ms)
are negligible beside a multi-second judge, so a concurrency-bounded pool of `judge()`
calls is a faithful ceiling for the end-to-end pipeline.

## Environment

| | |
|---|---|
| CPU | AMD Ryzen 5 3550H — **4 cores / 8 threads** |
| RAM | 14 GB |
| OS | Windows 10 + Docker Desktop (**WSL2** backend) |
| Image | `oj-cpp-runner:2` (gcc), cold container per submission |
| Problem | `two-sum`, 10 cases, N = 15 judges per level |

> Dev-machine numbers. Production targets a Linux VM (DECISIONS 005), where per-container
> overhead is materially lower than Docker Desktop's WSL2 path — treat these as a
> conservative floor.

## Results

| Concurrency | Throughput (subs/s) | Mean (ms) | p50 (ms) | p95 (ms) | Max (ms) | Wall (s) |
|---|---|---|---|---|---|---|
| 1 | 0.11 | 8708 | 8716 | 10134 | 10134 | 130.6 |
| 2 | 0.19 | 9937 | 9587 | 11367 | 11367 | 79.0 |
| 4 | 0.27 | 13801 | 13981 | 15762 | 15762 | 54.7 |

## Analysis

- **Throughput scales with concurrency, but sublinearly:** 1× → 2× → 4× workers yields
  1.0× → 1.7× → 2.5× throughput (~62% parallel efficiency at concurrency 4). The pool
  works — more workers judge more submissions per second.
- **Per-judge latency rises under load** (8.7 s → 9.9 s → 13.8 s) because parallel
  compiles contend for cores. With **4 physical cores**, concurrency 4 is roughly the
  saturation point: four `g++` processes run at once, each slower, but the aggregate
  still wins.
- **Where the ~8.7 s single-judge time goes:** cold-container start + compiling
  `#include <bits/stdc++.h>` dominate; the 10 short program runs are a small tail. So
  the bottleneck is **startup + compilation**, not execution — and Docker Desktop's
  WSL2 container overhead inflates the startup portion on this host.

## Levers (deliberately not yet pulled)

The current design is cold-container-per-submission by choice (DECISIONS 004: "start
cold, add a warm pool only if benchmarks demand it"). These numbers are the "before."
Faster, in rough order of impact:

1. **Warm container pool** — reuse running containers, paying cold-start once instead of
   per submission. Biggest win given startup dominates.
2. **Cut compile time** — a precompiled header for the harness (or dropping
   `bits/stdc++.h`) trims the largest single component.
3. **A real Linux host** — removes the Docker-Desktop/WSL2 overhead baked into these
   numbers.
4. **More cores** — throughput scales until physical cores saturate (~4 here).

## Reproduce

```powershell
# needs Docker Desktop + the oj-cpp-runner image; no Mongo/Redis required
npm run -w @oj/server benchmark
# tune:
$env:OJ_BENCH_N=24; $env:OJ_BENCH_LEVELS="1,2,4,8"; npm run -w @oj/server benchmark
```
