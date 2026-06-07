import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { api } from "../lib/api.js";

// Problem library (ROADMAP Step 25; design per DECISIONS 024): a LeetCode-style
// table — status / title / difficulty / acceptance / tags — with difficulty, tag,
// and status filters plus title search.
//
// The catalog is small (v1 = ~15-25 problems), so we fetch the whole list once and
// filter/search in the browser: it's instant, keeps all the filter logic in one
// place, and is the only option for the status filter anyway (the API doesn't
// filter by per-user status). The backend's difficulty/tag/q query params (Step 18)
// stay available for when the catalog grows. We re-fetch when sign-in state changes
// because per-user `status` only comes back when a token is attached.

const DIFFICULTY_CLASS = {
  Easy: "text-easy",
  Medium: "text-medium",
  Hard: "text-hard",
};

export default function ProblemsPage() {
  const { isLoaded, isSignedIn } = useAuth();

  const [problems, setProblems] = useState(null); // null while loading
  const [error, setError] = useState(null);

  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState("All");
  const [tag, setTag] = useState("All");
  const [status, setStatus] = useState("All");

  useEffect(() => {
    if (!isLoaded) return; // wait for Clerk so a signed-in user's token is ready
    let alive = true;
    setProblems(null);
    setError(null);
    api
      .listProblems()
      .then((data) => alive && setProblems(data.problems))
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [isLoaded, isSignedIn]);

  // Tag dropdown options come from the full list (not the filtered view).
  const allTags = useMemo(() => {
    const set = new Set();
    (problems || []).forEach((p) => (p.tags || []).forEach((t) => set.add(t)));
    return [...set].sort();
  }, [problems]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (problems || []).filter((p) => {
      if (q && !p.title.toLowerCase().includes(q)) return false;
      if (difficulty !== "All" && p.difficulty !== difficulty) return false;
      if (tag !== "All" && !(p.tags || []).includes(tag)) return false;
      if (status !== "All") {
        const st = p.status || "none";
        if (status === "Solved" && st !== "solved") return false;
        if (status === "Attempted" && st !== "attempted") return false;
        if (status === "Todo" && st !== "none") return false;
      }
      return true;
    });
  }, [problems, search, difficulty, tag, status]);

  const hasFilters =
    search !== "" || difficulty !== "All" || tag !== "All" || status !== "All";

  const resetFilters = () => {
    setSearch("");
    setDifficulty("All");
    setTag("All");
    setStatus("All");
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-white">Problems</h1>
        <p className="mt-1 text-sm text-zinc-400">
          {problems === null
            ? "Loading…"
            : hasFilters
              ? `${filtered.length} of ${problems.length} problems`
              : `${problems.length} problem${problems.length === 1 ? "" : "s"}`}
        </p>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title…"
          className="h-9 min-w-56 flex-1 rounded-md border border-edge bg-panel px-3 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-brand focus:outline-none"
        />
        <Select
          label="Difficulty"
          value={difficulty}
          onChange={setDifficulty}
          options={[
            { value: "All", label: "All difficulties" },
            "Easy",
            "Medium",
            "Hard",
          ]}
        />
        <Select
          label="Tag"
          value={tag}
          onChange={setTag}
          options={[{ value: "All", label: "All tags" }, ...allTags]}
        />
        {isSignedIn && (
          <Select
            label="Status"
            value={status}
            onChange={setStatus}
            options={[
              { value: "All", label: "Any status" },
              "Solved",
              "Attempted",
              "Todo",
            ]}
          />
        )}
        {hasFilters && (
          <button
            onClick={resetFilters}
            className="h-9 rounded-md px-3 text-sm text-zinc-400 hover:text-zinc-200"
          >
            Clear
          </button>
        )}
      </div>

      {error ? (
        <Panel>
          <p className="text-sm text-hard">
            Couldn’t load problems: {error} — is the API running on :4000?
          </p>
        </Panel>
      ) : problems === null ? (
        <Panel>
          <p className="text-sm text-zinc-400">Loading problems…</p>
        </Panel>
      ) : problems.length === 0 ? (
        <Panel>
          <p className="text-sm text-zinc-400">
            No problems seeded yet. Run{" "}
            <code className="rounded bg-panel-hover px-1.5 py-0.5 text-xs text-zinc-300">
              npm run -w @oj/server seed
            </code>{" "}
            to add Two Sum.
          </p>
        </Panel>
      ) : filtered.length === 0 ? (
        <Panel>
          <p className="text-sm text-zinc-400">No problems match your filters.</p>
        </Panel>
      ) : (
        <div className="overflow-hidden rounded-lg border border-edge">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-edge bg-panel text-xs uppercase tracking-wide text-zinc-500">
                <th className="w-10 px-4 py-3" aria-label="Status" />
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Difficulty</th>
                <th className="px-4 py-3 font-medium">Acceptance</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">Tags</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr
                  key={p.slug}
                  className="border-b border-edge/50 last:border-0 hover:bg-panel/60"
                >
                  <td className="px-4 py-3">
                    <StatusCell status={p.status} />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/problems/${p.slug}`}
                      className="font-medium text-zinc-200 hover:text-brand"
                    >
                      {p.title}
                    </Link>
                  </td>
                  <td
                    className={`px-4 py-3 font-medium ${
                      DIFFICULTY_CLASS[p.difficulty] || "text-zinc-300"
                    }`}
                  >
                    {p.difficulty}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-zinc-400">
                    {p.acceptanceRate == null ? "—" : `${p.acceptanceRate}%`}
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    <div className="flex flex-wrap gap-1.5">
                      {(p.tags || []).map((t) => (
                        <span
                          key={t}
                          className="rounded bg-panel-hover px-1.5 py-0.5 text-xs text-zinc-400"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// A styled <select>. `options` items are either a plain string (value === label)
// or a { value, label } pair (used for the descriptive "All …" defaults).
function Select({ label, value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      className="h-9 rounded-md border border-edge bg-panel px-2 text-sm text-zinc-200 focus:border-brand focus:outline-none"
    >
      {options.map((o) =>
        typeof o === "string" ? (
          <option key={o} value={o}>
            {o}
          </option>
        ) : (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        )
      )}
    </select>
  );
}

function Panel({ children }) {
  return (
    <div className="rounded-lg border border-edge bg-panel p-4">{children}</div>
  );
}

// Solved → green check, Attempted → amber dot, Todo/none → empty. Per-user status
// only arrives when signed in (and only lights up once the user has submissions).
function StatusCell({ status }) {
  if (status === "solved") {
    return (
      <span title="Solved" className="text-easy">
        <CheckIcon />
      </span>
    );
  }
  if (status === "attempted") {
    return (
      <span
        title="Attempted"
        className="inline-block h-2.5 w-2.5 rounded-full bg-medium"
      />
    );
  }
  return null;
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}
