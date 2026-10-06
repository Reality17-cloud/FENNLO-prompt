"use client";
import { useState } from "react";
import { Icon } from "./ui";

export function SuggestedReply({ message }: { message: string }) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setCopyError(false);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyError(true);
    }
  }
  return (
    <div className="message-surface">
      <div className="message-heading">
        <span className="message-title">Suggested reply</span>
        <button className="copy-button" onClick={copy}>
          <Icon name={copied ? "check" : "copy"} />
          {copied ? "Copied" : "Copy reply"}
        </button>
      </div>
      <p className="client-message">{message}</p>
      <span className="sr-only" role="status">
        {copied ? "Message copied to clipboard." : ""}
      </span>
      {copyError && (
        <p className="copy-error" role="status">
          Copy is unavailable. Select the message and copy it manually.
        </p>
      )}
    </div>
  );
}
