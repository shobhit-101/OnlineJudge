import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { SignedIn, SignedOut, SignInButton, useUser } from "@clerk/clerk-react";
import { api } from "../lib/api.js";
import { verdictMeta } from "../lib/verdict.js";
import { langLabel, timeAgo } from "../lib/format.js";
import { DIFFICULTY_CLASS } from "../lib/difficulty.js";

// Profile dashboard (ROADMAP Step 28; design per DECISIONS 024): solved-by-
// difficulty, an activity heatmap, and a recent-submissions feed — all from the
// Step 22 GET /api/profile aggregates (derived from submissions).
export default function ProfilePage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <SignedOut>
        <div className="rounded-lg border border-edge bg-panel p-6 text-sm text-zinc-400">
          <SignInButton mode="modal">
            <button className="text-brand hover:underline">Sign in</button>
          </SignInButton>{" "}
          to view your profile.
        </div>
      </SignedOut>
      <SignedIn>
        <Dashboard />
      </SignedIn>
    </div>
  );
}

function Dashboard() {
  const { user } = useUser();
  const [dash, setDash] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    api
      .getProfile()
      .then((d) => alive && setDash(d.dashboard))
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, []);

  if (error)
    return <p className="text-sm text-hard">Couldn’t load profile: {error}</p>;
  if (!dash) return <p className="text-sm text-zinc-400">Loading…</p>;

  const name =
    user?.firstName || user?.primaryEmailAddress?.emailAddress || "you";

  return (
    <div className="space-y-8">
      <header className="flex items-center gap-4">
        {user?.imageUrl && (
          <img
            src={user.imageUrl}
            alt=""
            className="h-12 w-12 rounded-full border border-edge"
          />
        )}
        <div>
          <h1 className="text-xl font-semibold text-white">{name}</h1>
          <p className="text-sm text-zinc-400">{dash.totalSolved} solved</p>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-3">
        {["Easy", "Medium", "Hard"].map((d) => (
          <div key={d} className="rounded-lg border border-edge bg-panel p-4">
            <div className={`text-2xl font-semibold ${DIFFICULTY_CLASS[d]}`}>
              {dash.solvedByDifficulty?.[d] ?? 0}
            </div>
            <div className="mt-1 text-xs text-zinc-500">{d}</div>
          </div>
        ))}
      </div>

      <section>
        <h2 className="mb-3 text-sm font-medium text-zinc-300">Activity</h2>
        <Heatmap heatmap={dash.heatmap || {}} />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-zinc-300">
          Recent submissions
        </h2>
        <RecentFeed items={dash.recentActivity || []} />
      </section>
    </div>
  );
}

function RecentFeed({ items }) {
  if (items.length === 0)
    return (
      <div className="rounded-lg border border-edge bg-panel p-4 text-sm text-zinc-400">
        No submissions yet.
      </div>
    );
  return (
    <div className="overflow-hidden rounded-lg border border-edge">
      <table className="w-full text-left text-sm">
        <tbody>
          {items.map((it) => {
            const meta = verdictMeta(it.verdict);
            return (
              <tr key={it.id} className="border-b border-edge/50 last:border-0">
                <td className="px-4 py-2.5">
                  {it.problem ? (
                    <Link
                      to={`/problems/${it.problem.slug}`}
                      className="text-zinc-200 hover:text-brand"
                    >
                      {it.problem.title}
                    </Link>
                  ) : (
                    <span className="text-zinc-500">(removed)</span>
                  )}
                </td>
                <td className={`px-4 py-2.5 font-medium ${meta.cls}`}>
                  {meta.label}
                </td>
                <td className="px-4 py-2.5 text-zinc-500">
                  {langLabel(it.language)}
                </td>
                <td className="px-4 py-2.5 text-right text-zinc-500">
                  {timeAgo(it.createdAt)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Heatmap({ heatmap }) {
  const weeks = useMemo(() => buildHeatmap(heatmap, 18), [heatmap]);
  const total = useMemo(
    () => Object.values(heatmap).reduce((a, b) => a + b, 0),
    [heatmap]
  );

  return (
    <div className="rounded-lg border border-edge bg-panel p-4">
      <div className="overflow-x-auto">
        <div className="flex gap-1">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1">
              {week.map((cell) => (
                <span
                  key={cell.key}
                  title={`${cell.count} submission${
                    cell.count === 1 ? "" : "s"
                  } on ${cell.key}`}
                  className={`h-3 w-3 rounded-sm ${heatColor(cell.count)}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
        <span>
          {total} submission{total === 1 ? "" : "s"} in the last 18 weeks
        </span>
        <span className="flex items-center gap-1">
          Less
          <span className="h-3 w-3 rounded-sm bg-panel-hover" />
          <span className="h-3 w-3 rounded-sm bg-easy/40" />
          <span className="h-3 w-3 rounded-sm bg-easy/70" />
          <span className="h-3 w-3 rounded-sm bg-easy" />
          More
        </span>
      </div>
    </div>
  );
}

const DAY = 86400000;

// Build `weeks` columns of 7 day-cells ending today, in UTC (the heatmap keys are
// UTC days). Columns are week-aligned (Sunday-first); leading padding days show 0.
function buildHeatmap(heatmap, weeks) {
  const now = new Date();
  const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  let start = end - (weeks * 7 - 1) * DAY;
  start -= new Date(start).getUTCDay() * DAY; // back up to Sunday

  const cells = [];
  for (let t = start; t <= end; t += DAY) {
    const key = new Date(t).toISOString().slice(0, 10);
    cells.push({ key, count: heatmap[key] || 0 });
  }
  const cols = [];
  for (let i = 0; i < cells.length; i += 7) cols.push(cells.slice(i, i + 7));
  return cols;
}

function heatColor(count) {
  if (!count) return "bg-panel-hover";
  if (count >= 6) return "bg-easy";
  if (count >= 3) return "bg-easy/70";
  return "bg-easy/40";
}
