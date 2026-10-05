import Link from "next/link";
import { pageAccount } from "@/lib/auth";
import { database } from "@/lib/db";
import { ThreadService } from "@/lib/threads";
import { ThreadNav } from "@/components/thread-nav";
export const dynamic = "force-dynamic";
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await pageAccount();
  const threads = await new ThreadService(database()).list(user.id);
  return (
    <div className="app-shell">
      <header className="app-header">
        <Link href="/app" className="wordmark">
          FENNLO
        </Link>
        <span className="product-label">Client Next Move</span>
        <Link className="account-link" href="/account">
          Account
        </Link>
      </header>
      <div className="app-body">
        <ThreadNav threads={threads} />
        <main className="thread-main">{children}</main>
      </div>
    </div>
  );
}
