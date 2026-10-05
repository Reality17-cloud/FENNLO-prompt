"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { ClientThread } from "@/lib/workspace-schema";
import { Icon } from "./ui";

type NavigationProps = {
  threads: Pick<ClientThread, "id" | "title" | "status">[];
  path: string;
  close?: () => void;
};

function NavigationContents({ threads, path, close }: NavigationProps) {
  const active = threads.filter((t) => t.status === "ACTIVE");
  const history = threads.filter((t) => t.status !== "ACTIVE");
  return (
    <>
      <Link
        className="new-thread secondary"
        href="/app"
        onClick={close}
        aria-current={path === "/app" ? "page" : undefined}
      >
        <Icon name="plus" />
        New client
      </Link>
      <nav aria-label="Client threads">
        <p className="nav-label">Active threads</p>
        {active.length === 0 && (
          <p className="nav-empty">Your client threads will live here.</p>
        )}
        {active.map((t) => (
          <Link
            key={t.id}
            href={`/app/${t.id}`}
            title={t.title}
            aria-current={path === `/app/${t.id}` ? "page" : undefined}
            onClick={close}
          >
            {t.title}
          </Link>
        ))}
        {history.length > 0 && (
          <>
            <p className="nav-label history-label">History</p>
            {history.map((t) => (
              <Link
                key={t.id}
                href={`/app/${t.id}`}
                title={t.title}
                aria-current={path === `/app/${t.id}` ? "page" : undefined}
                onClick={close}
              >
                {t.title}
                <span className="thread-status">
                  {t.status === "ARCHIVED" ? "Archived" : "Complete"}
                </span>
              </Link>
            ))}
          </>
        )}
      </nav>
      <div className="sidebar-footer">
        <Link href="/privacy" onClick={close}>
          Privacy
        </Link>
        <Link href="/terms" onClick={close}>
          Terms
        </Link>
      </div>
    </>
  );
}

export function ThreadNav({ threads }: Pick<NavigationProps, "threads">) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const drawer = useRef<HTMLDialogElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  function close() {
    drawer.current?.close();
  }
  useEffect(() => {
    const query = window.matchMedia("(min-width: 901px)");
    const resize = () => {
      if (query.matches) drawer.current?.close();
    };
    query.addEventListener("change", resize);
    return () => query.removeEventListener("change", resize);
  }, []);
  return (
    <>
      <button
        ref={toggle}
        className="mobile-thread-toggle"
        aria-expanded={open}
        aria-controls="thread-drawer"
        onClick={() => {
          drawer.current?.showModal();
          setOpen(true);
        }}
      >
        <Icon name="panel" />
        Threads
      </button>
      <aside className="sidebar desktop-sidebar">
        <NavigationContents threads={threads} path={path} />
      </aside>
      <dialog
        id="thread-drawer"
        ref={drawer}
        className="thread-drawer"
        aria-label="Client thread navigation"
        onKeyDown={(e) => {
          if (e.key !== "Tab") return;
          const focusable = Array.from(
            e.currentTarget.querySelectorAll<HTMLElement>(
              "a[href], button:not(:disabled)",
            ),
          );
          const first = focusable[0],
            last = focusable.at(-1);
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }}
        onClose={() => {
          setOpen(false);
          toggle.current?.focus();
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
      >
        <div className="drawer-content">
          <div className="drawer-header">
            <span className="wordmark">FENNLO</span>
            <button
              className="icon-button"
              aria-label="Close thread navigation"
              onClick={close}
              autoFocus
            >
              <Icon name="close" />
            </button>
          </div>
          <div className="sidebar">
            <NavigationContents threads={threads} path={path} close={close} />
          </div>
        </div>
      </dialog>
    </>
  );
}
