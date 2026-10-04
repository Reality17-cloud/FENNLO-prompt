"use client";

import { FormEvent, useState } from "react";

type Result = {
  next_move: string;
  send: string;
  why: string;
};

export default function Home() {
  const [conversation, setConversation] = useState("");
  const [goal, setGoal] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!conversation.trim() || !goal.trim() || loading) return;

    setLoading(true);
    setError("");
    setResult(null);
    setCopied(false);

    try {
      const response = await fetch("/api/next-move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation, goal }),
      });
      const data = (await response.json()) as Result & { error?: string };
      if (!response.ok) throw new Error(data.error || "Request failed.");
      setResult(data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Fennlo couldn't continue.");
    } finally {
      setLoading(false);
    }
  }

  async function copyReply() {
    if (!result) return;
    await navigator.clipboard.writeText(result.send);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">FENNLO</div>
        <div className="beta">CLIENT NEXT MOVE · BETA</div>
      </header>

      <section className="hero">
        <p className="eyebrow">One goal. One next move.</p>
        <h1>Know what to send next.</h1>
        <p className="subhead">
          Paste what the client said. Tell Fennlo what you want to achieve.
          It determines the next valid move before writing the reply.
        </p>
      </section>

      <form className="composer" onSubmit={submit}>
        <label className="field">
          <span>What did the client say?</span>
          <textarea
            value={conversation}
            onChange={(event) => setConversation(event.target.value)}
            placeholder="Paste the latest message or conversation here…"
            rows={8}
            maxLength={20000}
          />
        </label>

        <label className="field">
          <span>What do you want to achieve?</span>
          <textarea
            value={goal}
            onChange={(event) => setGoal(event.target.value)}
            placeholder="Example: Keep the deal without lowering the price."
            rows={3}
            maxLength={4000}
          />
        </label>

        <button className="primary" type="submit" disabled={loading || !conversation.trim() || !goal.trim()}>
          {loading ? "Determining…" : "Find next move"}
        </button>
      </form>

      {error ? <div className="error">{error}</div> : null}

      {result ? (
        <section className="result" aria-live="polite">
          <div className="resultBlock">
            <div className="resultLabel">NEXT MOVE</div>
            <p className="nextMove">{result.next_move}</p>
          </div>

          <div className="resultBlock sendBlock">
            <div className="resultHeader">
              <div className="resultLabel">SEND</div>
              <button className="copy" type="button" onClick={copyReply}>
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="sendText">{result.send}</p>
          </div>

          <details className="why">
            <summary>Why this?</summary>
            <p>{result.why}</p>
          </details>
        </section>
      ) : null}

      <footer className="footer">
        Fennlo does not follow the requested tactic blindly. It first checks what actually needs to be formed next.
      </footer>
    </main>
  );
}
