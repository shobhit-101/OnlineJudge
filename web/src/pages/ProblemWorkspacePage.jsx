import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { SignedIn, SignedOut, SignInButton } from "@clerk/clerk-react";
import Editor from "@monaco-editor/react";
import ReactMarkdown from "react-markdown";
import { api } from "../lib/api.js";
import { DIFFICULTY_CLASS } from "../lib/difficulty.js";

// Problem workspace (ROADMAP Steps 26-27; design per DECISIONS 024): a split pane —
// description on the left, Monaco editor + Run/Submit console on the right. Step 26
// built the shell + editor; Step 27 wires Run/Submit to the API and streams the live
// verdict (queued → compiling → running case n/m → AC/WA/…) into the Result tab via a
// fetch-based SSE reader. Submission history (the Submissions tab) lands in Step 28.

const ALL_LANGUAGES = [
  { id: "cpp", label: "C++", monaco: "cpp" },
  { id: "python", label: "Python", monaco: "python" },
  { id: "java", label: "Java", monaco: "java" },
];

const VERDICT_META = {
  AC: { label: "Accepted", cls: "text-easy" },
  WA: { label: "Wrong Answer", cls: "text-hard" },
  TLE: { label: "Time Limit Exceeded", cls: "text-medium" },
  MLE: { label: "Memory Limit Exceeded", cls: "text-medium" },
  RE: { label: "Runtime Error", cls: "text-hard" },
  CE: { label: "Compile Error", cls: "text-medium" },
};

const codeKey = (slug, lang) => `oj:code:${slug}:${lang}`;
const fmt = (v) => JSON.stringify(v);

export default function ProblemWorkspacePage() {
  const { slug } = useParams();

  const [problem, setProblem] = useState(null); // null while loading
  const [error, setError] = useState(null);

  const [language, setLanguage] = useState("cpp");
  const [code, setCode] = useState("");
  const [consoleTab, setConsoleTab] = useState("testcase");

  const [judging, setJudging] = useState(null); // null | "run" | "submit"
  const [progress, setProgress] = useState(null); // { text } while a job is live
  const [result, setResult] = useState(null); // terminal result event (+ kind)
  const abortRef = useRef(null);

  // Load the problem detail; reset any in-flight job + prior result on slug change.
  useEffect(() => {
    abortRef.current?.abort();
    setJudging(null);
    setProgress(null);
    setResult(null);

    let alive = true;
    setProblem(null);
    setError(null);
    api
      .getProblem(slug)
      .then((data) => alive && setProblem(data.problem))
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [slug]);

  // Abort a live stream if we unmount mid-judge.
  useEffect(() => () => abortRef.current?.abort(), []);

  // Seed the editor when the problem loads or the language changes: prefer the
  // user's saved draft (localStorage), else the problem's starter code.
  useEffect(() => {
    if (!problem) return;
    const starter = problem.starterCode?.[language] || "";
    const saved = localStorage.getItem(codeKey(slug, language));
    setCode(saved ?? starter);
  }, [problem, language, slug]);

  const onCodeChange = (value) => {
    const next = value ?? "";
    setCode(next);
    localStorage.setItem(codeKey(slug, language), next);
  };

  const resetCode = () => {
    if (!problem) return;
    localStorage.removeItem(codeKey(slug, language));
    setCode(problem.starterCode?.[language] || "");
  };

  // Submit a Run (sample cases) or Submit (full suite), then stream live progress.
  const runJob = async (kind) => {
    if (judging) return;
    const controller = new AbortController();
    abortRef.current = controller;

    setJudging(kind);
    setResult(null);
    setProgress({ text: "Submitting…" });
    setConsoleTab("result");

    try {
      const submit = kind === "run" ? api.run : api.submit;
      const { submissionId } = await submit({ problemSlug: slug, language, code });
      setProgress({ text: "In queue…" });

      await api.streamSubmission(submissionId, {
        signal: controller.signal,
        onEvent: (e) => {
          if (e.type === "status") setProgress({ text: phaseText(e.status) });
          else if (e.type === "progress")
            setProgress({ text: `Running test ${e.index}/${e.total}…` });
          else if (e.type === "result") {
            setResult({ ...e, kind });
            setProgress(null);
          }
        },
      });
    } catch (err) {
      if (err.name !== "AbortError") {
        setResult({ status: "error", error: err.message, kind });
        setProgress(null);
      }
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setJudging(null);
      }
    }
  };

  if (error) {
    return (
      <Centered>
        <p className="text-sm text-hard">Couldn’t load this problem: {error}</p>
        <BackLink />
      </Centered>
    );
  }
  if (!problem) {
    return (
      <Centered>
        <p className="text-sm text-zinc-400">Loading problem…</p>
      </Centered>
    );
  }

  const monacoLang =
    ALL_LANGUAGES.find((l) => l.id === language)?.monaco || "cpp";

  return (
    <div className="flex flex-col lg:h-[calc(100vh-3.5rem)] lg:flex-row">
      {/* LEFT: description */}
      <section className="border-b border-edge lg:w-1/2 lg:overflow-y-auto lg:border-b-0 lg:border-r">
        <div className="flex items-center gap-4 border-b border-edge px-6 py-2 text-sm">
          <span className="font-medium text-white">Description</span>
          <span
            className="cursor-not-allowed text-zinc-600"
            title="Submission history arrives in Step 28"
          >
            Submissions
          </span>
        </div>

        <div className="px-6 py-5">
          <h1 className="text-xl font-semibold text-white">{problem.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
            <span
              className={`font-medium ${
                DIFFICULTY_CLASS[problem.difficulty] || "text-zinc-300"
              }`}
            >
              {problem.difficulty}
            </span>
            {problem.acceptanceRate != null && (
              <span className="text-zinc-500">
                {problem.acceptanceRate}% acceptance
              </span>
            )}
          </div>

          <div className="mt-5 text-sm">
            <ReactMarkdown components={MD}>{problem.statement}</ReactMarkdown>
          </div>

          {problem.samples?.length > 0 && (
            <div className="mt-6 space-y-4">
              {problem.samples.map((s, i) => (
                <div key={i}>
                  <p className="mb-1 text-sm font-medium text-zinc-200">
                    Example {i + 1}
                  </p>
                  <div className="overflow-x-auto rounded-md border border-edge bg-panel px-4 py-3 font-mono text-xs leading-relaxed text-zinc-300">
                    <div>
                      <span className="text-zinc-500">Input: </span>
                      {formatInput(problem.signature, s.input)}
                    </div>
                    <div>
                      <span className="text-zinc-500">Output: </span>
                      {fmt(s.expected)}
                    </div>
                    {s.explanation && (
                      <div className="mt-1 font-sans text-zinc-400">
                        <span className="text-zinc-500">Explanation: </span>
                        {s.explanation}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {problem.constraints?.length > 0 && (
            <div className="mt-6">
              <p className="mb-2 text-sm font-medium text-zinc-200">Constraints</p>
              <ul className="list-disc space-y-1 pl-5 font-mono text-xs text-zinc-400">
                {problem.constraints.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          )}

          {problem.tags?.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-1.5">
              {problem.tags.map((t) => (
                <span
                  key={t}
                  className="rounded bg-panel px-2 py-0.5 text-xs text-zinc-400"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* RIGHT: editor + console */}
      <section className="flex flex-col lg:w-1/2">
        <div className="flex shrink-0 items-center gap-3 border-b border-edge px-4 py-2">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            aria-label="Language"
            className="h-8 rounded-md border border-edge bg-panel px-2 text-sm text-zinc-200 focus:border-brand focus:outline-none"
          >
            {ALL_LANGUAGES.map((l) => {
              const available = !!problem.starterCode?.[l.id];
              return (
                <option key={l.id} value={l.id} disabled={!available}>
                  {l.label}
                  {available ? "" : " (soon)"}
                </option>
              );
            })}
          </select>
          <button
            onClick={resetCode}
            className="h-8 rounded-md px-2 text-sm text-zinc-400 hover:text-zinc-200"
            title="Reset to starter code"
          >
            Reset
          </button>
          <div className="ml-auto flex items-center gap-2">
            <SignedOut>
              <SignInButton mode="modal">
                <button className="h-8 rounded-md bg-brand px-3 text-sm font-medium text-black hover:opacity-90">
                  Sign in to run
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <button
                onClick={() => runJob("run")}
                disabled={!!judging}
                className="h-8 rounded-md border border-edge px-3 text-sm text-zinc-200 hover:bg-panel-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {judging === "run" ? "Running…" : "Run"}
              </button>
              <button
                onClick={() => runJob("submit")}
                disabled={!!judging}
                className="h-8 rounded-md bg-brand px-3 text-sm font-medium text-black hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {judging === "submit" ? "Submitting…" : "Submit"}
              </button>
            </SignedIn>
          </div>
        </div>

        <div className="h-[55vh] min-h-0 lg:h-auto lg:flex-1">
          <Editor
            height="100%"
            language={monacoLang}
            theme="vs-dark"
            value={code}
            onChange={onCodeChange}
            options={{
              automaticLayout: true,
              minimap: { enabled: false },
              fontSize: 14,
              scrollBeyondLastLine: false,
              tabSize: 4,
              padding: { top: 12 },
              smoothScrolling: true,
            }}
            loading={
              <div className="p-4 text-sm text-zinc-500">Loading editor…</div>
            }
          />
        </div>

        <div className="flex h-56 shrink-0 flex-col border-t border-edge">
          <div className="flex items-center gap-4 border-b border-edge px-4 py-2 text-sm">
            <button
              onClick={() => setConsoleTab("testcase")}
              className={
                consoleTab === "testcase"
                  ? "font-medium text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              }
            >
              Testcase
            </button>
            <button
              onClick={() => setConsoleTab("result")}
              className={
                consoleTab === "result"
                  ? "font-medium text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              }
            >
              Result
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {consoleTab === "testcase" ? (
              <div className="space-y-3">
                <p className="text-xs text-zinc-500">
                  Run executes these sample cases; hidden cases run on Submit.
                </p>
                {problem.samples?.map((s, i) => (
                  <div key={i} className="font-mono text-xs text-zinc-300">
                    <div>
                      <span className="text-zinc-500">Case {i + 1}: </span>
                      {formatInput(problem.signature, s.input)}
                    </div>
                    <div>
                      <span className="text-zinc-500">Expected: </span>
                      {fmt(s.expected)}
                    </div>
                  </div>
                ))}
              </div>
            ) : progress ? (
              <div className="flex items-center gap-3 text-sm text-zinc-300">
                <Spinner />
                {progress.text}
              </div>
            ) : result ? (
              <ResultView result={result} signature={problem.signature} />
            ) : (
              <p className="text-sm text-zinc-500">
                Run or Submit to see the verdict.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

// signature.params zipped with the input array → "nums = [2,7,11,15], target = 9".
function formatInput(signature, input) {
  if (!signature?.params || !Array.isArray(input)) return fmt(input);
  return signature.params.map((p, i) => `${p.name} = ${fmt(input[i])}`).join(", ");
}

function phaseText(status) {
  if (status === "compiling") return "Compiling…";
  if (status === "running") return "Running…";
  if (status === "queued") return "In queue…";
  return "Judging…";
}

function formatMemory(kb) {
  if (kb == null) return "—";
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
}

function ResultView({ result, signature }) {
  if (result.status === "error") {
    return (
      <div className="text-sm">
        <div className="font-semibold text-hard">Judge Error</div>
        <p className="mt-1 text-zinc-400">
          {result.error || "Something went wrong while judging."}
        </p>
      </div>
    );
  }

  const meta = VERDICT_META[result.verdict] || {
    label: result.verdict,
    cls: "text-zinc-200",
  };

  return (
    <div className="text-sm">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className={`text-base font-semibold ${meta.cls}`}>{meta.label}</span>
        {result.verdict !== "CE" && result.passed != null && (
          <span className="text-zinc-500">
            {result.passed}/{result.total}{" "}
            {result.kind === "run" ? "sample" : "test"} cases passed
          </span>
        )}
      </div>

      {result.verdict !== "CE" && result.stats && (
        <div className="mt-1 text-xs text-zinc-500">
          {result.stats.timeMs != null && <>Time {result.stats.timeMs} ms</>}
          {result.stats.memoryKb != null && (
            <> · Memory {formatMemory(result.stats.memoryKb)}</>
          )}
        </div>
      )}

      {result.verdict === "CE" && result.compileOutput && (
        <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap rounded-md border border-edge bg-panel p-3 font-mono text-xs text-hard">
          {result.compileOutput}
        </pre>
      )}

      {result.failedCase && (
        <div className="mt-3 space-y-1 rounded-md border border-edge bg-panel p-3 font-mono text-xs text-zinc-300">
          <div>
            <span className="text-zinc-500">Input: </span>
            {formatInput(signature, result.failedCase.input)}
          </div>
          <div>
            <span className="text-zinc-500">Expected: </span>
            {fmt(result.failedCase.expected)}
          </div>
          <div>
            <span className="text-zinc-500">Output: </span>
            {result.failedCase.actual || "(no output)"}
          </div>
        </div>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-zinc-600 border-t-zinc-200" />
  );
}

// Tailwind styling for the markdown statement (no typography plugin needed). Each
// renderer drops react-markdown's `node` prop so it isn't spread onto the DOM.
const MD = {
  p: ({ node, ...props }) => (
    <p className="mb-3 leading-relaxed text-zinc-300" {...props} />
  ),
  strong: ({ node, ...props }) => (
    <strong className="font-semibold text-zinc-100" {...props} />
  ),
  code: ({ node, ...props }) => (
    <code
      className="rounded bg-panel-hover px-1.5 py-0.5 text-[0.85em] text-zinc-200"
      {...props}
    />
  ),
  ul: ({ node, ...props }) => (
    <ul className="mb-3 list-disc pl-5 text-zinc-300" {...props} />
  ),
  ol: ({ node, ...props }) => (
    <ol className="mb-3 list-decimal pl-5 text-zinc-300" {...props} />
  ),
  li: ({ node, ...props }) => <li className="mb-1" {...props} />,
  a: ({ node, ...props }) => (
    <a className="text-brand hover:underline" {...props} />
  ),
};

function Centered({ children }) {
  return <div className="mx-auto max-w-2xl px-4 py-20 text-center">{children}</div>;
}

function BackLink() {
  return (
    <Link
      to="/problems"
      className="mt-6 inline-block text-sm text-brand hover:underline"
    >
      ← Back to problems
    </Link>
  );
}
