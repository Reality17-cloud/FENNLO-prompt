"use client";
import { useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { Icon, LoadingIndicator } from "./ui";

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
  const [focused, setFocused] = useState(false);
  const firstName = clientName?.trim().split(/\s+/u)[0];
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
    <form
      onSubmit={submit}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false);
      }}
      className={`reality-composer ${focused && !disabled ? "expanded" : ""}`}
      aria-busy={loading}
    >
      <label htmlFor="reality" className="sr-only">
        Client update
      </label>
      <textarea
        ref={input}
        id="reality"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={
          firstName
            ? `What changed with ${firstName}?`
            : "What changed with the client?"
        }
        onFocus={() => setFocused(true)}
        maxLength={20000}
        rows={1}
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
        <button
          className="composer-submit"
          aria-label={loading ? "Determining…" : "Find next move"}
          title="Find next move · Ctrl / ⌘ + Enter"
          disabled={disabled || !value.trim()}
        >
          {loading ? <LoadingIndicator /> : null}
          {!loading && <Icon name="arrow" />}
        </button>
      </div>
    </form>
  );
}
