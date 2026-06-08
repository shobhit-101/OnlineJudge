// Typed fetch client for the Online Judge API. A plain ESM module (usable outside
// React): it injects the Clerk session token as `Authorization: Bearer …` on
// protected routes by reading the global Clerk instance (window.Clerk), which
// @clerk/clerk-react attaches once ClerkProvider has mounted. The browser's native
// EventSource can't send this header, so SSE (Step 27) will use a fetch reader.

// In dev BASE is "" and the Vite proxy forwards /api to the backend (same-origin).
// In production set VITE_API_BASE to the API origin.
const BASE = import.meta.env.VITE_API_BASE ?? "";

/**
 * @typedef {"Easy" | "Medium" | "Hard"} Difficulty
 * @typedef {"solved" | "attempted" | "none"} ProblemStatus
 *
 * @typedef {Object} ProblemListItem
 * @property {string} slug
 * @property {string} title
 * @property {Difficulty} difficulty
 * @property {string[]} tags
 * @property {number | null} acceptanceRate
 * @property {ProblemStatus} [status]  present only when signed in
 *
 * @typedef {Object} Profile
 * @property {number} totalSolved
 * @property {Record<string, number>} solvedByDifficulty
 * @property {Array<{ id: string, problemSlug: string, problemTitle: string, verdict: string, createdAt: string }>} recentActivity
 * @property {Record<string, number>} heatmap
 */

// Current Clerk session token, or {} when anonymous so callers can spread it into
// headers unconditionally.
async function authHeader() {
  try {
    const token = await window.Clerk?.session?.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

async function request(path, { method = "GET", body, auth = false } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth) Object.assign(headers, await authHeader());

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    // Backend errors are shaped `{ error: "message" }` (api/middleware/errors.js).
    let message = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data && data.error) message = data.error;
    } catch {
      /* non-JSON error body */
    }
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

function queryString(params) {
  if (!params) return "";
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== ""
  );
  return entries.length ? "?" + new URLSearchParams(entries).toString() : "";
}

// Live submission progress over SSE, read with fetch (the native EventSource can't
// send an Authorization header — the constraint tracked since Phase 3). Parses the
// `data: <json>\n\n` frames, calls onEvent(event) for each, and resolves when the
// terminal "result" event arrives or the stream ends. Pass an AbortSignal to cancel.
async function streamSubmission(id, { onEvent, signal } = {}) {
  const res = await fetch(`${BASE}/api/submissions/${id}/stream`, {
    headers: await authHeader(),
    signal,
  });
  if (!res.ok || !res.body) throw new Error(`stream failed (${res.status})`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let sep;
      while ((sep = buffer.indexOf("\n\n")) !== -1) {
        const frame = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        const data = frame
          .split("\n")
          .filter((l) => l.startsWith("data:"))
          .map((l) => l.slice(5).trim())
          .join("\n");
        if (!data) continue; // heartbeat / comment line
        let event;
        try {
          event = JSON.parse(data);
        } catch {
          continue;
        }
        onEvent?.(event);
        if (event.type === "result") return; // terminal
      }
    }
  } finally {
    reader.cancel().catch(() => {});
  }
}

export const api = {
  // --- public, but personalized when signed in: attaching a token (if present)
  //     makes the API include each problem's per-user `status`. ---
  /** @returns {Promise<{ problems: ProblemListItem[] }>} */
  listProblems: (params) =>
    request(`/api/problems${queryString(params)}`, { auth: true }),
  getProblem: (slug) => request(`/api/problems/${encodeURIComponent(slug)}`),
  // Public, but sending the token lets the owner receive their submitted code.
  getSubmission: (id) => request(`/api/submissions/${id}`, { auth: true }),

  // --- require auth (Clerk token injected) ---
  submit: ({ problemSlug, language, code }) =>
    request(`/api/submissions`, {
      method: "POST",
      body: { problemSlug, language, code },
      auth: true,
    }),
  run: ({ problemSlug, language, code }) =>
    request(`/api/run`, {
      method: "POST",
      body: { problemSlug, language, code },
      auth: true,
    }),
  getHistory: (problemSlug) =>
    request(`/api/submissions${queryString({ problem: problemSlug })}`, {
      auth: true,
    }),
  /** @returns {Promise<Profile>} */
  getProfile: () => request(`/api/profile`, { auth: true }),

  // Live progress for a submission (see streamSubmission above).
  streamSubmission,
};
