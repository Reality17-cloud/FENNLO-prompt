"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client-api";
import {
  parseDetail,
  type ThreadDetail,
  type ThreadTurn,
} from "@/lib/workspace-schema";
import { ThreadEntry } from "./thread-entry";
import { RealityComposer } from "./reality-composer";
import { LoadingIndicator } from "./ui";
import { ThreadHeader } from "./thread-header";
export function ThreadWorkspace({ initial }: { initial: ThreadDetail }) {
  const router = useRouter();
  const [detail, setDetail] = useState(initial);
  const [reality, setReality] = useState("");
  const [busy, setBusy] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [notice, setNotice] = useState("");
  const timeline = useRef<HTMLElement>(null);
  const t = detail.thread;
  const latest = detail.turns.at(-1);
  useEffect(() => {
    // Keep programmatic scrolling inside the timeline, preserving the mobile shell.
    const viewport = timeline.current;
    const turn = viewport?.querySelector(".timeline-turn:last-of-type");
    const client = turn?.querySelector(".client-event");
    const target =
      client &&
      client.getBoundingClientRect().height < (viewport?.clientHeight ?? 0) / 2
        ? turn
        : (turn?.querySelector(".fennlo-turn") ?? turn);
    if (!viewport || !target) return;
    viewport.scrollTo({
      top:
        viewport.scrollTop +
        target.getBoundingClientRect().top -
        viewport.getBoundingClientRect().top,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  }, [latest?.id, latest?.status]);
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
    if (busy) return false;
    setBusy(true);
    setError("");
    try {
      const next = parseDetail(
        await api(base, "PATCH", { ...values, version: t.version }),
      );
      mergeLatest(next);
      setNotice(
        values.status === "ARCHIVED"
          ? "Thread archived."
          : values.status === "COMPLETED"
            ? "Thread marked complete."
            : values.status === "ACTIVE"
              ? "Thread reopened."
              : "Changes saved.",
      );
      router.refresh();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
      return false;
    } finally {
      setBusy(false);
    }
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
      <ThreadHeader
        thread={t}
        busy={busy}
        unresolved={Boolean(unresolved)}
        error={error}
        notice={notice}
        onUpdate={update}
      />
      <section
        ref={timeline}
        className="timeline"
        aria-label="Thread timeline"
        aria-busy={busy || t.processing}
      >
        <div className="timeline-content">
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
              <h2>What has happened so far?</h2>
              <p>
                Paste the client’s latest reply, a call summary, or a change in
                the situation. Your next move will appear here.
              </p>
            </div>
          )}
          {detail.turns.map((turn) => (
            <ThreadEntry
              key={turn.id}
              turn={turn}
              clientName={t.clientName}
              active={t.status === "ACTIVE"}
              disabled={busy || t.processing}
              onRetry={() => void determine(turn)}
            />
          ))}
          {generating && (
            <p className="loading-line" role="status">
              <LoadingIndicator />
              Determining the next move…
            </p>
          )}
        </div>
      </section>
      <div className="composer-region">
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {t.status === "ACTIVE" ? (
          <RealityComposer
            value={reality}
            onChange={setReality}
            onSubmit={() => void determine()}
            disabled={busy || t.processing || Boolean(unresolved)}
            loading={generating || t.processing}
            blocked={Boolean(unresolved)}
            clientName={t.clientName}
          />
        ) : (
          <p className="muted small">
            Reopen this thread to add a client update.
          </p>
        )}
      </div>
    </div>
  );
}
