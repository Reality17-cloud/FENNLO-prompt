"use client";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type FormEvent,
} from "react";
import type { ClientThread } from "@/lib/workspace-schema";
import { clientDisplayName } from "@/lib/client-display";
import { ClientAvatar } from "./client-identity";
import { Icon } from "./ui";
import { Modal } from "./modal";

type Editor = "goal" | "title" | "clientName" | "archive" | null;
export function ThreadHeader({
  thread: t,
  busy,
  unresolved,
  error,
  notice,
  onUpdate,
  momentContext,
}: {
  momentContext?: ReactNode;
  thread: ClientThread;
  busy: boolean;
  unresolved: boolean;
  error: string;
  notice: string;
  onUpdate: (values: Record<string, unknown>) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, right: 0 });
  const [editor, setEditor] = useState<Editor>(null);
  const menu = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const blocked = busy || t.processing;
  const name = clientDisplayName(t.clientName);
  useEffect(() => {
    if (!open) return;
    menu.current
      ?.querySelector<HTMLElement>('[role="menuitem"]:not(:disabled)')
      ?.focus();
    const outside = (event: PointerEvent) => {
      if (!menu.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        toggle.current?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  function edit(value: Editor) {
    setOpen(false);
    setEditor(value);
  }
  function close() {
    setEditor(null);
    toggle.current?.focus();
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(
      new FormData(event.currentTarget).entries(),
    );
    if (await onUpdate(values)) close();
  }
  const titles = {
    goal: "Edit goal",
    title: "Rename project",
    clientName: "Edit client name",
    archive: "Archive this client?",
  };
  return (
    <>
      <header className="thread-header">
        <div className="thread-header-inner">
          <div className="thread-identity">
            <ClientAvatar name={t.clientName} />
            <div className="thread-context">
              <p className="thread-client-name" title={name}>
                {name}
              </p>
              <h1>{t.title}</h1>
              <p className="thread-goal" aria-label="Persistent goal">
                {t.goal}
              </p>
            </div>
          </div>
          <div className="client-menu" ref={menu}>
            <button
              ref={toggle}
              className="icon-button client-menu-toggle"
              aria-label="Client options"
              aria-haspopup="menu"
              aria-expanded={open}
              aria-controls="client-options"
              onClick={() => {
                const box = toggle.current?.getBoundingClientRect();
                if (box)
                  setPosition({
                    top: box.bottom + 6,
                    right: Math.max(12, window.innerWidth - box.right),
                  });
                setOpen(!open);
              }}
            >
              <Icon name="more" />
            </button>
            {open && (
              <div
                className="client-menu-popover"
                style={position}
                id="client-options"
                role="menu"
                aria-label="Client options"
                onKeyDown={(e) => {
                  if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key))
                    return;
                  e.preventDefault();
                  const items = Array.from(
                    e.currentTarget.querySelectorAll<HTMLButtonElement>(
                      "button:not(:disabled)",
                    ),
                  );
                  const index = items.indexOf(
                    document.activeElement as HTMLButtonElement,
                  );
                  items[
                    e.key === "Home"
                      ? 0
                      : e.key === "End"
                        ? items.length - 1
                        : (index +
                            (e.key === "ArrowDown" ? 1 : -1) +
                            items.length) %
                          items.length
                  ]?.focus();
                }}
              >
                <button
                  role="menuitem"
                  disabled={blocked || unresolved}
                  onClick={() => edit("goal")}
                >
                  <Icon name="edit" />
                  Edit goal
                </button>
                <button
                  role="menuitem"
                  disabled={blocked}
                  onClick={() => edit("title")}
                >
                  <Icon name="edit" />
                  Rename project
                </button>
                <button
                  role="menuitem"
                  disabled={blocked}
                  onClick={() => edit("clientName")}
                >
                  <Icon name="person" />
                  Edit client name
                </button>
                <div className="menu-separator" />
                {t.status === "ACTIVE" ? (
                  <>
                    <button
                      role="menuitem"
                      disabled={blocked}
                      onClick={() => edit("archive")}
                    >
                      <Icon name="archive" />
                      Archive client
                    </button>
                    <button
                      role="menuitem"
                      disabled={blocked}
                      onClick={() => {
                        setOpen(false);
                        void onUpdate({ status: "COMPLETED" });
                      }}
                    >
                      <Icon name="check" />
                      Mark complete
                    </button>
                  </>
                ) : (
                  <button
                    role="menuitem"
                    disabled={blocked}
                    onClick={() => {
                      setOpen(false);
                      void onUpdate({ status: "ACTIVE" });
                    }}
                  >
                    <Icon name="arrow" />
                    Reopen thread
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        {t.status !== "ACTIVE" && (
          <div className="closed-note">
            <span>
              {t.status === "ARCHIVED" ? "Archived" : "Completed"} conversation
            </span>
            <button
              className="text-button"
              disabled={blocked}
              onClick={() => void onUpdate({ status: "ACTIVE" })}
            >
              Reopen thread
            </button>
          </div>
        )}
        <div className="moment-context">{momentContext}</div>
        <span className="save-notice" role="status">
          {notice}
        </span>
      </header>
      {editor && (
        <Modal title={titles[editor]} busy={blocked} onClose={close}>
          {editor === "archive" ? (
            <>
              <p className="modal-description">
                {name}’s conversation will move to History. You can reopen it
                later.
              </p>
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              <div className="modal-actions">
                <button
                  className="secondary"
                  onClick={close}
                  disabled={blocked}
                  data-autofocus
                >
                  Cancel
                </button>
                <button
                  className="button"
                  disabled={blocked}
                  onClick={async () => {
                    if (await onUpdate({ status: "ARCHIVED" })) close();
                  }}
                >
                  {busy ? "Archiving…" : "Archive client"}
                </button>
              </div>
            </>
          ) : (
            <form className="form-stack" onSubmit={save}>
              {editor === "goal" ? (
                <>
                  <label htmlFor="edit-goal">Goal</label>
                  <textarea
                    id="edit-goal"
                    name="goal"
                    defaultValue={t.goal}
                    maxLength={4000}
                    rows={5}
                    required
                    disabled={blocked || unresolved}
                    data-autofocus
                  />
                  <p className="field-hint">
                    Only you change the goal. This edit will stay in the
                    conversation history.
                  </p>
                </>
              ) : editor === "title" ? (
                <>
                  <label htmlFor="edit-title">Project</label>
                  <input
                    id="edit-title"
                    name="title"
                    defaultValue={t.title}
                    maxLength={120}
                    required
                    disabled={blocked}
                    data-autofocus
                  />
                </>
              ) : (
                <>
                  <label htmlFor="edit-client-name">Client name</label>
                  <input
                    id="edit-client-name"
                    name="clientName"
                    defaultValue={t.clientName ?? ""}
                    maxLength={120}
                    required
                    disabled={blocked}
                    data-autofocus
                  />
                </>
              )}
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary"
                  disabled={blocked}
                  onClick={close}
                >
                  Cancel
                </button>
                <button className="button" disabled={blocked}>
                  {busy ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </>
  );
}
