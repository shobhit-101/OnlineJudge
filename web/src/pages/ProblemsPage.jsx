import { useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { api } from "../lib/api.js";

// Step-24 scaffold placeholder. The real library (filters, search, status badges)
// is Step 25. For now this verifies the three things the scaffold must prove:
//   1. the shell renders,
//   2. the API client reaches the backend (public GET /api/problems),
//   3. when signed in, the Clerk token round-trips through a protected route
//      (GET /api/profile) — the login → token → backend-verify loop that was
//      untestable headless in Phase 3.
export default function ProblemsPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();

  const [problems, setProblems] = useState(null);
  const [apiError, setApiError] = useState(null);

  const [profile, setProfile] = useState(null);
  const [authError, setAuthError] = useState(null);

  // Public API call — no token needed.
  useEffect(() => {
    let alive = true;
    api
      .listProblems()
      .then((data) => alive && setProblems(data.problems))
      .catch((e) => alive && setApiError(e.message));
    return () => {
      alive = false;
    };
  }, []);

  // Protected API call — exercises the Bearer-token injection when signed in.
  useEffect(() => {
    if (!isSignedIn) {
      setProfile(null);
      setAuthError(null);
      return;
    }
    let alive = true;
    api
      .getProfile()
      .then((p) => alive && setProfile(p))
      .catch((e) => alive && setAuthError(e.message));
    return () => {
      alive = false;
    };
  }, [isSignedIn]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-white">Problems</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Scaffold placeholder — the full library (filters, search, status badges)
          arrives in Step 25.
        </p>
      </header>

      <section className="mb-4 rounded-lg border border-edge bg-panel p-4">
        <h2 className="mb-3 text-sm font-medium text-zinc-300">API connection</h2>
        {apiError ? (
          <p className="text-sm text-hard">
            Couldn’t reach the API: {apiError} — is the server running on :4000?
          </p>
        ) : problems === null ? (
          <p className="text-sm text-zinc-400">Loading…</p>
        ) : problems.length === 0 ? (
          <p className="text-sm text-zinc-400">
            Connected ✓ — no problems seeded yet.
          </p>
        ) : (
          <ul className="divide-y divide-edge/60 text-sm">
            {problems.map((p) => (
              <li key={p.slug} className="flex items-center gap-3 py-2">
                <DifficultyDot difficulty={p.difficulty} />
                <span className="text-zinc-200">{p.title}</span>
                <span className="text-xs text-zinc-500">
                  {p.acceptanceRate == null ? "—" : `${p.acceptanceRate}%`}
                </span>
                {p.status && p.status !== "none" && (
                  <span className="ml-auto text-xs capitalize text-zinc-500">
                    {p.status}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-edge bg-panel p-4">
        <h2 className="mb-2 text-sm font-medium text-zinc-300">
          Auth round-trip
        </h2>
        {!isLoaded ? (
          <p className="text-sm text-zinc-400">Loading Clerk…</p>
        ) : !isSignedIn ? (
          <p className="text-sm text-zinc-400">
            Signed out — use “Sign in” above to exercise the Clerk token
            round-trip against the backend.
          </p>
        ) : authError ? (
          <p className="text-sm text-hard">
            Signed in, but the protected call failed: {authError}
          </p>
        ) : profile ? (
          <p className="text-sm text-easy">
            Token verified ✓ — signed in as{" "}
            {user?.primaryEmailAddress?.emailAddress ?? "you"}; backend reports{" "}
            {profile.totalSolved} solved.
          </p>
        ) : (
          <p className="text-sm text-zinc-400">Verifying token…</p>
        )}
      </section>
    </div>
  );
}

function DifficultyDot({ difficulty }) {
  const color =
    difficulty === "Easy"
      ? "bg-easy"
      : difficulty === "Hard"
        ? "bg-hard"
        : "bg-medium";
  return (
    <span
      className={`inline-block h-2 w-2 shrink-0 rounded-full ${color}`}
      title={difficulty}
    />
  );
}
