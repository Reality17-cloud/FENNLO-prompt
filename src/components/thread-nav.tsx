"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import type { ClientThread } from "@/lib/workspace-schema";
import { Icon } from "./ui";
import { ClientAvatar } from "./client-identity";
import { clientDisplayName } from "@/lib/client-display";

type NavigationProps = {
  threads: Pick<ClientThread, "id" | "title" | "status" | "clientName">[];
  path: string;
  close?: () => void;
  accountEmail: string;
};

function NavigationContents({
  threads,
  path,
  close,
  accountEmail,
}: NavigationProps) {
  const active = threads.filter((t) => t.status === "ACTIVE");
  const history = threads.filter((t) => t.status !== "ACTIVE");
  return (
    <>
      <Link
        className="new-thread secondary"
        href="/app?new=1"
        onClick={close}
        aria-current={path === "/app" ? "page" : undefined}
      >
        <Icon name="plus" />
        New client
      </Link>
      <nav aria-label="Client threads">
        <p className="nav-label">Clients</p>
        {active.length === 0 && (
          <p className="nav-empty">Your clients will appear here.</p>
        )}
        {active.map((t) => (
          <Link
            key={t.id}
            href={`/app/${t.id}`}
            title={t.title}
            aria-label={`${clientDisplayName(t.clientName)} — ${t.title}`}
            aria-current={path === `/app/${t.id}` ? "page" : undefined}
            onClick={close}
          >
            <ClientAvatar name={t.clientName} size="small" />
            <span className="nav-client">
              <span>{clientDisplayName(t.clientName)}</span>
              <span className="nav-project">{t.title}</span>
            </span>
          </Link>
        ))}
        {history.length > 0 && (
          <>
            <details
              className="nav-history"
              open={history.some((t) => path === `/app/${t.id}`)}
            >
              <summary>
                History <span>{history.length}</span>
              </summary>
              {history.map((t) => (
                <Link
                  key={t.id}
                  href={`/app/${t.id}`}
                  title={t.title}
                  aria-label={`${clientDisplayName(t.clientName)} — ${t.title}`}
                  aria-current={path === `/app/${t.id}` ? "page" : undefined}
                  onClick={close}
                >
                  <ClientAvatar name={t.clientName} size="small" />
                  <span className="nav-client">
                    <span>{clientDisplayName(t.clientName)}</span>
                    <span className="nav-project">{t.title}</span>
                    <span className="thread-status">
                      {t.status === "ARCHIVED" ? "Archived" : "Complete"}
                    </span>
                  </span>
                </Link>
              ))}
            </details>
          </>
        )}
      </nav>
      <div className="sidebar-footer">
        <Link
          href="/account"
          className="sidebar-account"
          aria-label="Account"
          onClick={close}
        >
          <span className="account-symbol">
            <Icon name="person" />
          </span>
          <span>
            <strong>Account</strong>
            <span className="sidebar-email">{accountEmail}</span>
          </span>
        </Link>
        <div className="sidebar-legal">
          <Link href="/privacy" onClick={close}>
            Privacy
          </Link>
          <Link href="/terms" onClick={close}>
            Terms
          </Link>
        </div>
      </div>
    </>
  );
}

export function ThreadNav({
  threads,
  accountEmail,
}: Pick<NavigationProps, "threads" | "accountEmail">) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const drawer = useRef<HTMLDialogElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  function close() {
    drawer.current?.close();
  }
  return (
    <>
      <button
        ref={toggle}
        className="client-switcher-toggle"
        aria-label="Clients"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="thread-drawer"
        onClick={() => {
          drawer.current?.showModal();
          setOpen(true);
        }}
      >
        <span>
          {clientDisplayName(
            threads.find((t) => path === `/app/${t.id}`)?.clientName,
          ) === "Client" && path === "/app"
            ? "Clients"
            : clientDisplayName(
                threads.find((t) => path === `/app/${t.id}`)?.clientName,
              )}
        </span>
        <span className="chevron" aria-hidden="true">
          ⌄
        </span>
      </button>
      <dialog
        id="thread-drawer"
        ref={drawer}
        className="thread-drawer"
        aria-label="Client navigation"
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
          const box = e.currentTarget.getBoundingClientRect();
          if (
            e.target === e.currentTarget &&
            (e.clientX < box.left ||
              e.clientX > box.right ||
              e.clientY < box.top ||
              e.clientY > box.bottom)
          )
            close();
        }}
      >
        <div className="drawer-content">
          <div className="drawer-header">
            <h2>Clients</h2>
            <button
              className="icon-button"
              aria-label="Close client navigation"
              onClick={close}
              autoFocus
            >
              <Icon name="close" />
            </button>
          </div>
          <div className="client-list">
            <NavigationContents
              threads={threads}
              path={path}
              accountEmail={accountEmail}
              close={close}
            />
          </div>
        </div>
      </dialog>
    </>
  );
}
