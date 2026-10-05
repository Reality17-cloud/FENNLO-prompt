"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/client-api";
export function AuthForm({ signup }: { signup: boolean }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const data = new FormData(e.currentTarget);
    setError("");
    setBusy(true);
    try {
      await api(`/api/auth/${signup ? "signup" : "signin"}`, "POST", {
        email: data.get("email"),
        password: data.get("password"),
      });
      window.location.assign("/app");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
      setBusy(false);
    }
  }
  return (
    <main className="auth-layout">
      <aside className="auth-aside">
        <Link href="/" className="wordmark">
          FENNLO
        </Link>
        <div className="auth-context">
          <span>Client Next Move</span>
          <h2>A place for your client conversations.</h2>
          <p>
            Keep the goal in view.
            <br />
            Take the next move back to your client.
          </p>
        </div>
        <nav aria-label="Legal">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </nav>
      </aside>
      <div className="auth-main">
        <div className="auth-page">
          <h1>{signup ? "Create account" : "Sign in"}</h1>
          <p className="muted">
            {signup
              ? "Your client conversations, kept together."
              : "Sign in to your client threads."}
          </p>
          <form onSubmit={submit} className="form-stack">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              maxLength={254}
              required
              disabled={busy}
            />
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={signup ? "new-password" : "current-password"}
              minLength={signup ? 15 : 1}
              maxLength={128}
              required
              disabled={busy}
            />
            {signup && (
              <p className="field-hint">
                Use at least 15 characters. A memorable passphrase works well.
              </p>
            )}
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button className="button" disabled={busy}>
              {busy ? "Please wait…" : signup ? "Create account" : "Sign in"}
            </button>
          </form>
          {signup && (
            <p className="small muted">
              By creating an account, you agree to the{" "}
              <Link href="/terms">Terms</Link> and acknowledge the{" "}
              <Link href="/privacy">Privacy policy</Link>.
            </p>
          )}
          <p className="auth-alternative">
            {signup ? "Already have an account? " : "New to Fennlo? "}
            <Link href={signup ? "/signin" : "/signup"}>
              {signup ? "Sign in" : "Create an account"}
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
