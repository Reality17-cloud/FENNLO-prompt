"use client";
import { useLayoutEffect, useRef, type FormEvent } from "react";
import { Icon, LoadingIndicator } from "./ui";
import { clientPlaceholder } from "@/lib/client-display";

export function RealityComposer({
  value,
  onChange,
  onSubmit,
  disabled,
  loading,
  blocked,
  clientName,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled: boolean;
  loading: boolean;
  blocked: boolean;
  clientName: string | null;
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
      <label htmlFor="reality" className="sr-only">
        Client update
      </label>
      <textarea
        ref={input}
        id="reality"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={clientPlaceholder(clientName)}
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
              <span className="keyboard-hint">Ctrl / ⌘ + Enter to submit</span>
            </>
          )}
        </span>
        <button className="button" disabled={disabled || !value.trim()}>
          {loading ? <LoadingIndicator /> : null}
          {loading ? "Determining…" : "Find next move"}
          {!loading && <Icon name="arrow" />}
        </button>
      </div>
    </form>
  );
}
