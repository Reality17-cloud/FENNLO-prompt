import Link from "next/link";
export function PublicHeader() {
  return (
    <header className="public-header">
      <Link className="wordmark" href="/">
        FENNLO
      </Link>
      <nav aria-label="Main navigation">
        <Link href="/signin">Sign in</Link>
        <Link className="button secondary compact" href="/signup">
          Get started
        </Link>
      </nav>
    </header>
  );
}
export function PublicFooter() {
  return (
    <footer className="public-footer">
      <span>FENNLO · Client Next Move</span>
      <nav aria-label="Legal">
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
      </nav>
    </footer>
  );
}
