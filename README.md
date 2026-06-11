# Online Judge

A from-scratch, LeetCode-style coding platform: pick a problem, write code in an
in-browser editor, hit **Submit**, and get a live, color-coded verdict
(**AC / WA / TLE / MLE / RE / CE**) with runtime and memory stats.

The point of this project is the part most "interview platform" clones outsource:
**the code-execution engine is built from scratch** — the job queue, the worker pool,
the Docker sandbox, the resource limits, and the verdict logic are all ours. No Judge0,
no Piston, no "run code via an API." Running untrusted code safely *is* the project.

> **Status:** v1 (C++) is feature-complete end-to-end. Python and Java are next — the
> engine is built to add them additively. See [Roadmap](#status--roadmap).

---

## Why it's different

The only things integrated rather than built are the two nobody should hand-roll:
**authentication** (Clerk) and the **code editor** (Monaco, the VS Code engine).
Everything that makes a judge a judge is implemented here:

- A **Docker sandbox** that safely compiles and runs untrusted submissions, hardened
  flag-by-flag against the obvious attacks (infinite loops, memory/fork bombs, file and
  network access, kernel surface).
- A **Redis Streams** queue + a **worker pool** with consumer groups and crash recovery,
  so submissions are absorbed in bursts and judged in parallel.
- A **verdict engine** that assembles a per-language harness, compiles once, runs every
  test case, and classifies the outcome.
- **Live progress** streamed to the browser over SSE (`queued → compiling → running n/m
  → verdict`).

## Features

- Problem **library** with difficulty / tag / status filters and search.
- Problem **workspace**: split view with the statement, the **Monaco** editor, and a
  Run/Submit console.
- **Run** against sample cases (quick check) or **Submit** against the full hidden suite.
- **Live verdicts** with runtime + memory, and the failing case's input / expected / output.
- **Submission history** (with read-only past code) and a **profile dashboard**
  (solved-by-difficulty, activity heatmap, recent feed).
- **16 curated problems** across Easy / Medium / Hard, each with hidden test cases.

## Architecture

```
            Browser  (React + Tailwind + Monaco)
               │  REST + SSE  (Clerk Bearer token)
               ▼
        ┌──────────────┐   enqueue job    ┌──────────────┐   XREADGROUP   ┌──────────────┐
        │  API server  │ ───────────────► │ Redis Stream │ ─────────────► │ Worker pool  │
        │  (Express)   │                  │   + pub/sub  │                │ (N async     │
        │              │ ◄─── progress ── │              │ ◄── publish ── │  loops)      │
        └──────┬───────┘   (SSE bridge)   └──────────────┘                └──────┬───────┘
               │                                                                 │ judge:
               ▼                                                                 ▼ compile + run
        ┌──────────────┐                                                  ┌──────────────┐
        │   MongoDB    │  problems · submissions · test cases             │ Docker sandbox│
        └──────────────┘                                                  │ (1 / submission,
                                                                          │  fully isolated)
                                                                          └──────────────┘
```

The worker and the browser never talk directly: the worker **publishes** progress to a
Redis channel, and the API — which holds the browser's SSE connection — **relays** it.
That decoupling is what lets the worker pool scale.

| Concern | Choice | Build / Integrate |
|---|---|---|
| Execution sandbox | Docker, hand-configured isolation | **Build** |
| Queue | Redis Streams | **Build** |
| Worker pool | Our own worker processes | **Build** |
| Verdict logic | Our own (AC/WA/TLE/MLE/RE/CE) | **Build** |
| Realtime | SSE + Redis pub/sub | **Build** |
| API | Node + Express | **Build** |
| Database | MongoDB | **Build** |
| Frontend | React (Vite) + Tailwind + Monaco | **Build** UI, **integrate** editor |
| Auth | Clerk | **Integrate** |

## The sandbox (the hard part)

Every submission runs in its own throwaway Docker container, hardened so that hostile
code can't escape, exhaust the host, or phone home. Each control maps to an attack:

| Isolation control | Stops |
|---|---|
| Wall-clock timeout (container killed) | Infinite loops → **TLE** |
| `--memory` limit + OOM detection | Memory bombs → **MLE** |
| `--pids-limit` | Fork bombs |
| `--network none` | Data exfiltration / callbacks |
| Read-only root FS + small `tmpfs` workspace | Tampering, filling the disk |
| Non-root user, dropped Linux capabilities, `--security-opt no-new-privileges` | Privilege escalation |
| Custom **seccomp allowlist** (deny-by-default, ~190 syscalls) | Kernel attack surface (`ptrace`, `mount`, `bpf`, …) |

Compilation is sandboxed too (its own time/memory caps), so compiler bombs are contained.
Docker is used for v1; microVMs (gVisor / Firecracker) are noted as the stronger option.

## Tech stack

JavaScript end-to-end (MERN), npm-workspaces monorepo · **Node + Express** · **MongoDB**
· **Redis Streams** · **Docker** (driven via the `docker` CLI) · **React + Vite +
Tailwind + Monaco** · **Clerk** auth.

## Performance

Cold-container-per-submission baseline on a 4-core dev laptop (Windows + Docker Desktop):

| Concurrency | Throughput | Mean latency |
|---|---|---|
| 1 | 0.11 subs/s | 8.7 s |
| 2 | 0.19 subs/s | 9.9 s |
| 4 | 0.27 subs/s | 13.8 s |

Throughput scales sub-linearly (≈62% efficiency at 4×); the dominant cost is container
start + `g++` compilation, not execution. A warm container pool is the documented next
optimization. Full methodology and analysis: **[BENCHMARKS.md](BENCHMARKS.md)**.

## Running locally

**Prerequisites:** Node ≥ 20, Docker Desktop, a MongoDB connection string (local or
Atlas), and a [Clerk](https://clerk.com) app (free tier).

```bash
# 1. install (both workspaces)
npm install

# 2. build the C++ runner image
npm run -w @oj/server build:image:cpp

# 3. start Redis (queue + pub/sub)
docker run -d --name oj-redis --restart unless-stopped -p 6379:6379 redis:7-alpine

# 4. configure env (see the .env.example files)
#    server/.env : MONGODB_URI, CLERK_SECRET_KEY, CLERK_PUBLISHABLE_KEY, REDIS_URL
#    web/.env    : VITE_CLERK_PUBLISHABLE_KEY
cp .env.example server/.env
cp web/.env.example web/.env

# 5. seed the problem set
npm run -w @oj/server seed

# 6. run the three processes (separate terminals)
npm run -w @oj/server dev      # API     → http://localhost:4000
npm run -w @oj/server worker   # judge pool
npm run -w @oj/web dev         # web app → http://localhost:5173
```

Open http://localhost:5173, sign in, pick a problem, and submit.

## Project structure

```
online-judge/
├── server/                     # backend (Node + Express) — build-free
│   └── src/
│       ├── sandbox/            # Docker isolation + in-container runner
│       ├── engine/             # harness assembly, comparator, verdict logic
│       ├── queue/              # Redis Streams producer + pub/sub bridge
│       ├── worker/             # consumer pool + crash recovery + benchmark
│       ├── api/                # Express routes, Clerk auth, SSE
│       └── data/               # Mongo models, problem set, seed
├── web/                        # frontend (Vite + React + Tailwind + Monaco)
│   └── src/{pages,components,lib}
└── BENCHMARKS.md
```

## Status & roadmap

| | |
|---|---|
| ✅ Sandbox | Docker isolation, seccomp, outcome classification, containment tests |
| ✅ Pipeline | harness + comparator + verdict engine, Redis queue, worker pool |
| ✅ API | problems, submit/run, live SSE, Clerk auth, history/profile, stats |
| ✅ Frontend | library, workspace + Monaco, live verdicts, history, dashboard |
| ✅ Content | 16 problems with hidden tests; throughput/latency benchmarks |
| ⏭ Languages | add Python, then Java (additive: image + harness + starter code) |
| ⏭ Ship | threat-model write-up, Linux deployment |

Constraints by design: exactly three languages (Python / C++ / Java), LeetCode-style
function-signature judging (scalars, strings, booleans, 1D/2D arrays in v1), single
canonical answers (exact-match, no special judges).
