"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client-api";
import { threadSchema } from "@/lib/workspace-schema";
export function NewThread() {
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
  return (
    <div className="new-thread-page">
      <p className="eyebrow">Client Next Move</p>
      <h1>New client thread</h1>
      <p className="muted">
        Keep one client situation and its next moves together.
      </p>
      <form onSubmit={submit} className="form-stack">
        <label htmlFor="title">
          Thread name <span className="muted normal">(optional)</span>
        </label>
        <input
          name="title"
          id="title"
          placeholder="e.g. Acme website"
          maxLength={120}
          disabled={busy}
        />
        <label htmlFor="goal">What are you trying to achieve?</label>
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
          {busy ? "Creating…" : "Create client thread"}
        </button>
      </form>
      <p className="small muted privacy-note">
        Only paste client information you have permission to use.{" "}
        <a href="/privacy">How your data is handled</a>
      </p>
    </div>
  );
}
