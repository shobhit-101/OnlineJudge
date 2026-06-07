# @oj/web — frontend

Vite + React (JS) + Tailwind + Monaco + Clerk. LeetCode-style dark UI. Talks to the
`@oj/server` API. (Stack rationale: DECISIONS 024.)

## Run

```bash
# 1. one-time: copy env and confirm the Clerk publishable key
cp web/.env.example web/.env

# 2. start the backend (separate terminals) — needed for live data
npm run -w @oj/server dev      # API on :4000
npm run -w @oj/server worker   # judge pool   (also needs oj-redis up)

# 3. start the frontend
npm run -w @oj/web dev         # http://localhost:5173
```

The dev server proxies `/api` and `/health` to `http://localhost:4000`, so the
browser stays same-origin. The `fetch` API client (`src/lib/api.js`) attaches the
Clerk session token (`Authorization: Bearer …`) on protected routes.

## Layout

- `src/main.jsx` — React root: ClerkProvider + Router.
- `src/App.jsx` — route table.
- `src/components/` — app shell (Navbar, Layout).
- `src/pages/` — routed pages (fleshed out across Steps 25–28).
- `src/lib/api.js` — typed fetch client.
