"use client";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Icon } from "./ui";

export function Modal({
  title,
  children,
  busy,
  onClose,
}: {
  title: string;
  children: ReactNode;
  busy: boolean;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [closing, setClosing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function dismiss() {
    if (busy || closing) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      dialog.current?.close();
      return;
    }
    setClosing(true);
    timer.current = setTimeout(() => dialog.current?.close(), 190);
  }
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    (
      element?.querySelector<HTMLElement>("[data-autofocus]") ??
      element?.querySelector<HTMLElement>("input, textarea, button")
    )?.focus();
    return () => {
      if (timer.current) clearTimeout(timer.current);
      element?.close();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className={`modal ${closing ? "closing" : ""}`}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        dismiss();
      }}
      onClose={onClose}
      onClick={(e) => {
        const box = e.currentTarget.getBoundingClientRect();
        if (
          !busy &&
          e.target === e.currentTarget &&
          (e.clientX < box.left ||
            e.clientX > box.right ||
            e.clientY < box.top ||
            e.clientY > box.bottom)
        )
          dismiss();
      }}
      onKeyDown={(e) => {
        if (e.key !== "Tab") return;
        const targets = Array.from(
          e.currentTarget.querySelectorAll<HTMLElement>(
            "input:not(:disabled), textarea:not(:disabled), button:not(:disabled), a[href]",
          ),
        );
        const first = targets[0],
          last = targets.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }}
    >
      <div className="modal-heading">
        <h2 id={titleId}>{title}</h2>
        <button
          type="button"
          className="icon-button"
          aria-label="Close dialog"
          disabled={busy}
          onClick={dismiss}
        >
          <Icon name="close" />
        </button>
      </div>
      {children}
    </dialog>
  );
}
