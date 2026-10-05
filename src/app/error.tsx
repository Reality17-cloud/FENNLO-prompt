"use client";
import Link from "next/link";
export default function ErrorPage({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <main className="auth-page">
      <Link className="wordmark" href="/">
        FENNLO
      </Link>
      <h1>Unable to open Fennlo</h1>
      <p className="muted">
        The workspace is temporarily unavailable. Please try again.
      </p>
      <button className="button" onClick={retry}>
        Try again
      </button>
    </main>
  );
}
