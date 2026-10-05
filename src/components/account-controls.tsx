"use client";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/client-api";
export function AccountControls() {
  const [deleting, setDeleting] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function signout() {
    setBusy(true);
    setError("");
    try {
      await api("/api/auth/signout", "POST", {});
      window.location.assign("/signin");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
      setBusy(false);
    }
  }
  async function erase(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      await api("/api/auth/delete", "POST", {
        password: data.get("password"),
        confirmation: data.get("confirmation"),
      });
      window.location.assign("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
      setBusy(false);
    }
  }
  return (
    <>
      <button className="secondary" onClick={signout} disabled={busy}>
        Sign out
      </button>
      <section className="account-delete">
        <h2>Delete account</h2>
        <p className="muted">
          Permanently remove your account, all client threads, Reality, and
          saved results from the application database. All sessions will be
          invalidated.
        </p>
        {deleting ? (
          <form onSubmit={erase} className="form-stack">
            <label htmlFor="delete-password">Confirm your password</label>
            <input
              id="delete-password"
              name="password"
              type="password"
              autoComplete="current-password"
              maxLength={128}
              required
              disabled={busy}
            />
            <label htmlFor="confirmation">Type DELETE to confirm</label>
            <input
              id="confirmation"
              name="confirmation"
              required
              pattern="DELETE"
              disabled={busy}
              autoComplete="off"
            />
            <div className="actions">
              <button className="button danger" disabled={busy}>
                {busy ? "Deleting…" : "Permanently delete account"}
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => setDeleting(false)}
                disabled={busy}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            className="secondary danger-text"
            onClick={() => setDeleting(true)}
            disabled={busy}
          >
            Delete account
          </button>
        )}
      </section>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
