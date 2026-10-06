"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client-api";
import { threadSchema } from "@/lib/workspace-schema";
import { Icon } from "./ui";
export function NewThread({ startOpen = false }: { startOpen?: boolean }) {
  const [creating, setCreating] = useState(startOpen);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const data = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      const value = await api("/api/threads", "POST", {
        title: data.get("title"),
        clientName: data.get("clientName"),
        goal: data.get("goal"),
      });
      const parsed = threadSchema.safeParse(
        (value as { thread: unknown }).thread,
      );
      if (!parsed.success)
        throw new Error(
          "Fennlo couldn't verify the new thread. Refresh your workspace.",
        );
      const thread = parsed.data;
      router.push(`/app/${thread.id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
      setBusy(false);
    }
  }
  if (!creating)
    return (
      <section className="workspace-welcome">
        <h1>Start with a client.</h1>
        <p>
          Add the person you’re working with and what you’re trying to achieve.
        </p>
        <button className="button" onClick={() => setCreating(true)}>
          <Icon name="plus" />
          New client
        </button>
      </section>
    );
  return (
    <div className="new-thread-page">
      <div className="new-client-intro">
        <h1>New client</h1>
        <p className="muted">
          Add the person you’re working with and what you’re trying to achieve.
        </p>
      </div>
      <div className="new-client-form">
        <form onSubmit={submit} className="form-stack">
          <label htmlFor="client-name">Client name</label>
          <input
            id="client-name"
            name="clientName"
            placeholder="e.g. Sarah Chen"
            maxLength={120}
            required
            disabled={busy}
            autoComplete="off"
            autoFocus
          />
          <label htmlFor="title">
            Project <span className="muted normal">(optional)</span>
          </label>
          <input
            name="title"
            id="title"
            placeholder="e.g. Acme website"
            maxLength={120}
            disabled={busy}
          />
          <label htmlFor="goal">Goal</label>
          <textarea
            name="goal"
            id="goal"
            placeholder="e.g. Close the project without discounting."
            maxLength={4000}
            rows={4}
            required
            disabled={busy}
          />
          <p className="field-hint">
            Your goal stays with this thread. You can edit it later.
          </p>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button className="button" disabled={busy}>
            {busy ? "Starting…" : "Start conversation"}
          </button>
        </form>
        <p className="small muted privacy-note">
          Only paste client information you have permission to use.{" "}
          <a href="/privacy">How your data is handled</a>
        </p>
      </div>
    </div>
  );
}
