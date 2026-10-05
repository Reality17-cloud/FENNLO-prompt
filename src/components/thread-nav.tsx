"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { ClientThread } from "@/lib/workspace-schema";
export function ThreadNav({
  threads,
}: {
  threads: Pick<ClientThread, "id" | "title" | "status">[];
}) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const active = threads.filter((t) => t.status === "ACTIVE"),
    history = threads.filter((t) => t.status !== "ACTIVE");
  return (
    <>
      <button
        className="mobile-thread-toggle secondary"
        aria-expanded={open}
        aria-controls="thread-navigation"
        onClick={() => setOpen(!open)}
      >
        Threads <span aria-hidden="true">{open ? "−" : "+"}</span>
      </button>
      <aside
        id="thread-navigation"
        className={`sidebar ${open ? "is-open" : ""}`}
      >
        <Link
          className="new-thread button secondary"
          href="/app"
          onClick={() => setOpen(false)}
        >
          ＋ New client thread
        </Link>
        <nav aria-label="Client threads">
          <p className="nav-label">Active</p>
          {active.length === 0 && (
            <p className="nav-empty">No client threads yet.</p>
          )}
          {active.map((t) => (
            <Link
              key={t.id}
              href={`/app/${t.id}`}
              title={t.title}
              aria-current={path === `/app/${t.id}` ? "page" : undefined}
              onClick={() => setOpen(false)}
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
                  onClick={() => setOpen(false)}
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
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </div>
      </aside>
    </>
  );
}
