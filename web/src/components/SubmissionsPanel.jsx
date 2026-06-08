import { useEffect, useState } from "react";
import { SignedIn, SignedOut, SignInButton } from "@clerk/clerk-react";
import { api } from "../lib/api.js";
import { verdictMeta } from "../lib/verdict.js";
import { langLabel, timeAgo } from "../lib/format.js";
import VerdictSummary from "./VerdictSummary.jsx";

// The workspace's "Submissions" tab (ROADMAP Step 28): the signed-in user's past
// official attempts for this problem (GET /api/submissions?problem=slug, Step 22),
// each opening a read-only view of its submitted code (GET /api/submissions/:id —
// the API returns `code` only to the owner).
export default function SubmissionsPanel({ slug, signature }) {
  return (
    <div className="px-2 py-3">
      <SignedOut>
        <p className="px-4 py-6 text-sm text-zinc-400">
          <SignInButton mode="modal">
            <button className="text-brand hover:underline">Sign in</button>
          </SignInButton>{" "}
          to view your submissions.
        </p>
      </SignedOut>
      <SignedIn>
        <SubmissionsList slug={slug} signature={signature} />
      </SignedIn>
    </div>
  );
}

function SubmissionsList({ slug, signature }) {
  const [items, setItems] = useState(null); // null while loading
  const [error, setError] = useState(null);
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    let alive = true;
    setItems(null);
    setError(null);
    api
      .getHistory(slug)
      .then((d) => alive && setItems(d.submissions))
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [slug]);

  if (error)
    return (
      <p className="px-4 py-6 text-sm text-hard">
        Couldn’t load submissions: {error}
      </p>
    );
  if (items === null)
    return <p className="px-4 py-6 text-sm text-zinc-400">Loading…</p>;
  if (items.length === 0)
    return (
      <p className="px-4 py-6 text-sm text-zinc-400">
        No submissions yet — submit a solution to see it here.
      </p>
    );

  return (
    <>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-wide text-zinc-500">
            <th className="px-4 py-2 font-medium">Status</th>
            <th className="px-4 py-2 font-medium">Lang</th>
            <th className="px-4 py-2 font-medium">Runtime</th>
            <th className="px-4 py-2 text-right font-medium">When</th>
          </tr>
        </thead>
        <tbody>
          {items.map((s) => {
            const meta = verdictMeta(s.verdict);
            return (
              <tr
                key={s.id}
                onClick={() => setOpenId(s.id)}
                className="cursor-pointer border-t border-edge/50 hover:bg-panel/60"
              >
                <td className={`px-4 py-2 font-medium ${meta.cls}`}>
                  {meta.label}
                </td>
                <td className="px-4 py-2 text-zinc-400">{langLabel(s.language)}</td>
                <td className="px-4 py-2 tabular-nums text-zinc-400">
                  {s.stats?.timeMs != null ? `${s.stats.timeMs} ms` : "—"}
                </td>
                <td className="px-4 py-2 text-right text-zinc-500">
                  {timeAgo(s.createdAt)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {openId && (
        <SubmissionModal
          id={openId}
          signature={signature}
          onClose={() => setOpenId(null)}
        />
      )}
    </>
  );
}

function SubmissionModal({ id, signature, onClose }) {
  const [sub, setSub] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    api
      .getSubmission(id)
      .then((d) => alive && setSub(d.submission))
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [id]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-edge bg-surface p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-medium text-zinc-300">Submission</h3>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-200"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        {error ? (
          <p className="text-sm text-hard">{error}</p>
        ) : !sub ? (
          <p className="text-sm text-zinc-400">Loading…</p>
        ) : (
          <>
            <VerdictSummary data={sub} signature={signature} />
            <div className="mt-4">
              <p className="mb-1 text-xs uppercase tracking-wide text-zinc-500">
                {langLabel(sub.language)} · {timeAgo(sub.createdAt)}
              </p>
              {sub.code ? (
                <pre className="max-h-72 overflow-auto rounded-md border border-edge bg-panel p-3 font-mono text-xs leading-relaxed text-zinc-200">
                  {sub.code}
                </pre>
              ) : (
                <p className="text-sm text-zinc-500">Code unavailable.</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
