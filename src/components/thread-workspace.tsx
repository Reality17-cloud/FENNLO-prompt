"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client-api";
import {
  parseDetail,
  type ThreadDetail,
  type ThreadTurn,
} from "@/lib/workspace-schema";
import { Result } from "./result";
export function ThreadWorkspace({ initial }: { initial: ThreadDetail }) {
  const router = useRouter();
  const [detail, setDetail] = useState(initial);
  const [reality, setReality] = useState("");
  const [busy, setBusy] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [settings, setSettings] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const t = detail.thread;
  const base = `/api/threads/${t.id}`;
  const unresolved = detail.turns.find(
    (turn) => turn.status === "FAILED" || turn.status === "PENDING",
  );
  function mergeLatest(next: ThreadDetail) {
    setDetail((old) => {
      const min = next.turns[0]?.sequence;
      const older = min
        ? old.turns.filter((turn) => BigInt(turn.sequence) < BigInt(min))
        : [];
      return {
        ...next,
        turns: [...older, ...next.turns],
        older: older.length ? old.older : next.older,
      };
    });
  }
  async function reload() {
    const next = parseDetail(await api(base));
    mergeLatest(next);
    router.refresh();
    return next;
  }
  useEffect(() => {
    if (!t.processing) return;
    const timer = setTimeout(async () => {
      try {
        const next = parseDetail(await api(`/api/threads/${t.id}`));
        setDetail((old) => ({
          ...next,
          turns: [
            ...old.turns.filter(
              (turn) =>
                next.turns[0] &&
                BigInt(turn.sequence) < BigInt(next.turns[0].sequence),
            ),
            ...next.turns,
          ],
          older: old.older,
        }));
      } catch {
        setError(
          "Unable to refresh the thread. Reload to check the saved result.",
        );
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [t.id, t.processing, detail]);
  async function determine(turn?: ThreadTurn) {
    if (busy || t.processing) return;
    const text = turn?.reality ?? reality.trim();
    if (!text) return;
    const id = turn?.id ?? crypto.randomUUID();
    setBusy(true);
    setGenerating(true);
    setError("");
    try {
      const next = parseDetail(
        await api(`${base}/turns`, "POST", { id, reality: text }),
      );
      mergeLatest(next);
      if (!turn) setReality("");
      router.refresh();
      end.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
      try {
        const saved = await reload();
        if (saved.turns.some((r) => r.id === id) && !turn) setReality("");
      } catch {
        /* Keep the composer intact if the saved state cannot be read. */
      }
    } finally {
      setBusy(false);
      setGenerating(false);
    }
  }
  async function update(values: Record<string, unknown>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const next = parseDetail(
        await api(base, "PATCH", { ...values, version: t.version }),
      );
      mergeLatest(next);
      setSettings(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  async function saveSettings(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    await update({
      title: data.get("title"),
      ...(data.has("goal") ? { goal: data.get("goal") } : {}),
    });
  }
  async function older() {
    setLoadingOlder(true);
    try {
      const next = parseDetail(
        await api(`${base}?before=${detail.turns[0].sequence}`),
      );
      setDetail((old) => ({
        ...old,
        turns: [...next.turns, ...old.turns],
        older: next.older,
      }));
    } catch {
      setError("Unable to load earlier turns. Please try again.");
    } finally {
      setLoadingOlder(false);
    }
  }
  return (
    <div className="thread-workspace">
      <header className="thread-header">
        <div className="thread-title-line">
          <h1>{t.title}</h1>
          <button
            className="secondary compact"
            aria-expanded={settings}
            onClick={() => setSettings(!settings)}
          >
            Thread settings
          </button>
        </div>
        <div className="goal-line">
          <span>Goal</span>
          <p>{t.goal}</p>
        </div>
        {t.status !== "ACTIVE" && (
          <p className="closed-note">
            {t.status === "ARCHIVED" ? "Archived" : "Completed"} thread{" "}
            <button
              className="text-button"
              disabled={busy}
              onClick={() => update({ status: "ACTIVE" })}
            >
              Reopen thread
            </button>
          </p>
        )}
        {settings && (
          <div className="thread-settings">
            <form className="form-stack" onSubmit={saveSettings}>
              <label htmlFor="edit-title">Thread name</label>
              <input
                id="edit-title"
                name="title"
                defaultValue={t.title}
                maxLength={120}
                required
                disabled={busy || t.processing}
              />
              <label htmlFor="edit-goal">Goal</label>
              <textarea
                id="edit-goal"
                name="goal"
                defaultValue={t.goal}
                maxLength={4000}
                rows={3}
                required
                disabled={busy || t.processing || Boolean(unresolved)}
              />
              <p className="field-hint">
                Goal changes are saved as an explicit event. Resolve an
                unfinished determination before changing the goal.
              </p>
              <div className="actions">
                <button
                  className="button compact"
                  disabled={busy || t.processing}
                >
                  Save changes
                </button>
                <button
                  type="button"
                  className="secondary compact"
                  onClick={() => setSettings(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
            {t.status === "ACTIVE" && (
              <div className="thread-lifecycle">
                <button
                  className="text-button"
                  disabled={busy || t.processing}
                  onClick={() => update({ status: "ARCHIVED" })}
                >
                  Archive thread
                </button>
                <button
                  className="text-button"
                  disabled={busy || t.processing}
                  onClick={() => update({ status: "COMPLETED" })}
                >
                  Mark complete
                </button>
              </div>
            )}
          </div>
        )}
      </header>
      <section
        className="timeline"
        aria-label="Thread timeline"
        aria-busy={busy || t.processing}
      >
        {detail.older && (
          <button
            className="secondary compact older-button"
            onClick={older}
            disabled={loadingOlder}
          >
            {loadingOlder ? "Loading…" : "Load earlier turns"}
          </button>
        )}
        {detail.turns.length === 0 && (
          <div className="timeline-empty">
            <h2>Start with what happened.</h2>
            <p>
              Paste the client’s latest reply, a call summary, or a change in
              the situation. Your next move will appear here.
            </p>
          </div>
        )}
        {detail.turns.map((turn) => (
          <article key={turn.id} className="timeline-turn">
            {turn.kind === "GOAL" ? (
              <div className="goal-event">
                <span className="eyebrow">Goal updated</span>
                <p>{turn.reality}</p>
                <details>
                  <summary>Previous goal</summary>
                  <p>{turn.goalAtTurn}</p>
                </details>
              </div>
            ) : (
              <>
                <div className="reality-turn">
                  <div className="turn-meta">
                    <span className="eyebrow">You · Client Reality</span>
                    <time dateTime={turn.createdAt}>
                      {new Date(turn.createdAt).toLocaleDateString("en", {
                        month: "short",
                        day: "numeric",
                      })}
                    </time>
                  </div>
                  <p>{turn.reality}</p>
                </div>
                <div className="fennlo-turn">
                  <span className="author-label">FENNLO</span>
                  {turn.result ? (
                    <Result result={turn.result} />
                  ) : turn.status === "FAILED" ? (
                    <div className="turn-failure">
                      <p>{turn.error}</p>
                      <p className="small muted">
                        Your Reality is saved. Retry to continue from the last
                        verified state.
                      </p>
                      {t.status === "ACTIVE" && (
                        <button
                          className="secondary compact"
                          disabled={busy || t.processing}
                          onClick={() => determine(turn)}
                        >
                          Retry next move
                        </button>
                      )}
                    </div>
                  ) : (
                    <p className="loading-line" role="status">
                      Determining the next move…
                    </p>
                  )}
                </div>
              </>
            )}
          </article>
        ))}
        {generating && (
          <p className="loading-line" role="status">
            Determining the next move…
          </p>
        )}
        <div ref={end} />
      </section>
      <div className="composer-region">
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {t.status === "ACTIVE" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void determine();
            }}
            className="reality-composer"
          >
            <label htmlFor="reality">New Reality</label>
            <textarea
              id="reality"
              value={reality}
              onChange={(e) => setReality(e.target.value)}
              placeholder="Paste the client’s latest reply or tell Fennlo what changed…"
              maxLength={20000}
              rows={3}
              disabled={busy || t.processing || Boolean(unresolved)}
              required
            />
            <div className="composer-toolbar">
              <span className="small muted">
                {unresolved
                  ? "Resolve the unfinished turn above to continue."
                  : "Add what happened. Your goal stays with this thread."}
              </span>
              <button
                className="button"
                disabled={
                  busy || t.processing || Boolean(unresolved) || !reality.trim()
                }
              >
                {generating || t.processing ? "Determining…" : "Find next move"}
              </button>
            </div>
          </form>
        ) : (
          <p className="muted small">Reopen this thread to add new Reality.</p>
        )}
      </div>
    </div>
  );
}
