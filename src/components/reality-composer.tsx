"use client";
import { useLayoutEffect, useRef, type FormEvent } from "react";
import { Icon, LoadingIndicator } from "./ui";

export function RealityComposer({
  value,
  onChange,
  onSubmit,
  disabled,
  loading,
  blocked,
  threadTitle,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled: boolean;
  loading: boolean;
  blocked: boolean;
  threadTitle: string;
}) {
  const input = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const element = input.current;
    if (!element) return;
    const resize = () => {
      element.style.height = "auto";
      element.style.height = `${element.scrollHeight}px`;
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [value]);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!disabled && value.trim()) onSubmit();
  }
  return (
    <form onSubmit={submit} className="reality-composer" aria-busy={loading}>
      <div className="composer-heading">
        <label htmlFor="reality">New Reality</label>
        <span className="composer-context" title={threadTitle}>
          {threadTitle}
        </span>
      </div>
      <textarea
        ref={input}
        id="reality"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Paste the client’s latest reply or tell Fennlo what changed…"
        maxLength={20000}
        rows={2}
        disabled={disabled}
        required
        aria-describedby="composer-hint"
        onKeyDown={(e) => {
          // Enter remains a newline. Submit only on an explicit modifier, outside IME composition.
          if (
            e.key === "Enter" &&
            (e.metaKey || e.ctrlKey) &&
            !e.nativeEvent.isComposing
          ) {
            e.preventDefault();
            e.currentTarget.form?.requestSubmit();
          }
        }}
      />
      <div className="composer-toolbar">
        <span id="composer-hint" className="small muted">
          {blocked ? (
            "Resolve the unfinished turn above to continue."
          ) : (
            <>
              Your goal stays with this thread.
              <span className="keyboard-hint">Ctrl / ⌘ + Enter to submit</span>
            </>
          )}
        </span>
        <button className="button" disabled={disabled || !value.trim()}>
          {loading ? <LoadingIndicator /> : <Icon name="arrow" />}
          {loading ? "Determining…" : "Find next move"}
        </button>
      </div>
    </form>
  );
}
