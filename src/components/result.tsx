"use client";
import { useState } from "react";
import type { PublicNextMove } from "@/lib/schemas";
export function Result({ result }: { result: PublicNextMove }) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(result.send!);
      setCopied(true);
      setCopyError(false);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyError(true);
    }
  }
  return (
    <div className="formation-result">
      <div className="next-operation">
        <span className="eyebrow">Next move</span>
        <p>{result.next_move}</p>
      </div>
      {result.send !== null ? (
        <div className="message-surface">
          <div className="message-heading">
            <span className="eyebrow">Message</span>
            <button className="copy-button secondary compact" onClick={copy}>
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="client-message">{result.send}</p>
          {copyError && (
            <p className="small muted" role="status">
              Copy is unavailable. Select the message and copy it manually.
            </p>
          )}
        </div>
      ) : (
        <p className="no-message">No message yet.</p>
      )}
      <details className="why">
        <summary>Why this</summary>
        <p>{result.why}</p>
      </details>
    </div>
  );
}
