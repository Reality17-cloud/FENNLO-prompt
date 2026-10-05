"use client";
import { useEffect, useRef, type ReactNode } from "react";

export function WorkspaceShell({ children }: { children: ReactNode }) {
  const shell = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const sync = () => {
      const element = shell.current;
      if (!element) return;
      const mobile = window.matchMedia("(max-width: 900px)").matches;
      element.style.setProperty(
        "--workspace-height",
        `${mobile ? viewport.height : window.innerHeight}px`,
      );
      element.style.setProperty(
        "--workspace-top",
        `${mobile ? viewport.offsetTop : 0}px`,
      );
      const editing = document.activeElement?.matches("input, textarea");
      element.classList.toggle(
        "keyboard-open",
        Boolean(
          mobile && editing && window.innerHeight - viewport.height > 150,
        ),
      );
    };
    sync();
    viewport.addEventListener("resize", sync);
    viewport.addEventListener("scroll", sync);
    window.addEventListener("resize", sync);
    document.addEventListener("focusin", sync);
    document.addEventListener("focusout", sync);
    return () => {
      viewport.removeEventListener("resize", sync);
      viewport.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
      document.removeEventListener("focusin", sync);
      document.removeEventListener("focusout", sync);
    };
  }, []);
  return (
    <div ref={shell} className="app-shell">
      {children}
    </div>
  );
}
