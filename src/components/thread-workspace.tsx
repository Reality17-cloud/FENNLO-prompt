"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client-api";
import {
  parseDetail,
  type ThreadDetail,
  type ThreadTurn,
} from "@/lib/workspace-schema";
import { CurrentMoment } from "./current-moment";
import { Moments } from "./moments";
import { RealityComposer } from "./reality-composer";
import { ThreadHeader } from "./thread-header";
export function ThreadWorkspace({ initial }: { initial: ThreadDetail }) {
  const router = useRouter();
  const [detail, setDetail] = useState(initial);
  const [reality, setReality] = useState("");
  const [busy, setBusy] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [olderError, setOlderError] = useState("");
  const [notice, setNotice] = useState("");
  const timeline = useRef<HTMLElement>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [momentsOpen, setMomentsOpen] = useState(false);
  const momentsToggle = useRef<HTMLButtonElement>(null);
  const submission = useRef<{ id: string; draft: boolean } | null>(null);
  const t = detail.thread;
  const latest = detail.turns.at(-1);
  const shown = detail.turns.find((turn) => turn.id === selected) ?? latest;
  const historical = Boolean(shown && shown.id !== latest?.id);
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
    if (!t.processing && !generating) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const next = parseDetail(await api(`/api/threads/${t.id}`));
        if (cancelled) return;
        if (
          submission.current?.draft &&
          next.turns.some((turn) => turn.id === submission.current?.id)
        )
          setReality("");
        setDetail((old) =>
          next.thread.version < old.thread.version
            ? old
            : {
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
              },
        );
      } catch {
        if (cancelled) return;
        setError(
          "Unable to refresh the thread. Reload to check the saved result.",
        );
      }
    }, 2000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [t.id, t.processing, detail, generating]);
  async function determine(turn?: ThreadTurn) {
    if (busy || t.processing) return;
    const text = turn?.reality ?? reality.trim();
    if (!text) return;
    const id = turn?.id ?? crypto.randomUUID();
    submission.current = { id, draft: !turn };
    setBusy(true);
    setGenerating(true);
    setSelected(null);
    timeline.current?.scrollTo({ top: 0 });
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
      submission.current = null;
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
    setOlderError("");
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
      setOlderError("Unable to load earlier turns. Please try again.");
    } finally {
      setLoadingOlder(false);
    }
  }
  return (
    <div className="thread-workspace">
      <button
        ref={momentsToggle}
        className="moments-toggle text-button"
        onClick={() => setMomentsOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={momentsOpen}
      >
        Moments
      </button>
      <ThreadHeader
        thread={t}
        busy={busy}
        unresolved={Boolean(unresolved)}
        error={error}
        notice={notice}
        onUpdate={update}
        momentContext={
          historical && (
            <div className="historical-note">
              <span>Viewing earlier moment</span>
              <button
                className="text-button"
                onClick={() => {
                  setSelected(null);
                  timeline.current?.scrollTo({ top: 0 });
                }}
              >
                Return to latest
              </button>
              <p>Goal at this moment: {shown?.goalAtTurn}</p>
            </div>
          )
        }
      />
      <section
        ref={timeline}
        className="timeline"
        aria-label="Current client situation"
        aria-busy={busy || t.processing}
      >
        <div className="timeline-content">
          {detail.turns.length === 0 && !generating && (
            <div className="timeline-empty">
              <h2>What has happened so far?</h2>
              <p>
                Paste the client’s latest reply, a call summary, or a change in
                the situation. Your next move will appear here.
              </p>
            </div>
          )}
          {(shown || generating) && (
            <CurrentMoment
              key={shown?.id ?? "first"}
              turn={shown}
              historical={historical}
              determining={!historical && (generating || t.processing)}
              active={t.status === "ACTIVE"}
              disabled={busy || t.processing}
              onRetry={() => shown && void determine(shown)}
            />
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
      {momentsOpen && (
        <Moments
          turns={detail.turns}
          selected={shown?.id}
          older={detail.older}
          loading={loadingOlder}
          error={olderError}
          onOlder={older}
          onSelect={(id) => {
            setSelected(id);
            timeline.current?.scrollTo({ top: 0 });
          }}
          onClose={() => {
            setMomentsOpen(false);
            momentsToggle.current?.focus();
          }}
        />
      )}
    </div>
  );
}
