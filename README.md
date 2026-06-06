# Online Judge

A from-scratch, LeetCode-style coding platform. Pick a problem, write C++ (Python/Java later),
submit, and get a live, color-coded verdict — powered by a **self-built Docker sandbox execution
engine** (our own queue, worker pool, resource limits, and verdict logic), not a third-party
code-execution SaaS.

> 🚧 Early development. Built backend-first, sandbox-first.

## Docs
- [docs/spec.md](docs/spec.md) — product spec (what it does)
- [docs/architecture.md](docs/architecture.md) — how it's built, and what we build vs. integrate
- [docs/ROADMAP.md](docs/ROADMAP.md) — commit-by-commit build plan
- [docs/DECISIONS.md](docs/DECISIONS.md) — why we chose what we chose
- [docs/JOURNAL.md](docs/JOURNAL.md) — running timeline

## Stack
JavaScript (MERN) · Node + Express · MongoDB · Redis Streams · React + Monaco editor · Docker sandbox · Clerk auth

## Layout
- `server/` — backend: `src/{sandbox,engine,queue,worker,api,data,config}`
- `web/` — frontend (React, added in a later phase)

## Develop
```sh
npm install
# Redis (submission queue) as a local container:
docker run -d --name oj-redis --restart unless-stopped -p 6379:6379 redis:7-alpine
npm run -w @oj/server dev
```
Requires Node ≥ 20, Docker Desktop (sandbox + Redis), and a MongoDB connection
string in `server/.env` (see `.env.example`).
