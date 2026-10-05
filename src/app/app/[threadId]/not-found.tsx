import Link from "next/link";
export default function Missing() {
  return (
    <div className="new-thread-page">
      <h1>Thread unavailable</h1>
      <p className="muted">This thread could not be found in your account.</p>
      <Link className="button secondary" href="/app">
        Your workspace
      </Link>
    </div>
  );
}
