import Link from "next/link";
import { pageAccount } from "@/lib/auth";
import { database } from "@/lib/db";
import { ThreadService } from "@/lib/threads";
import { ThreadNav } from "@/components/thread-nav";
import { WorkspaceShell } from "@/components/workspace-shell";
export const dynamic = "force-dynamic";
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await pageAccount();
  const threads = await new ThreadService(database()).list(user.id);
  return (
    <WorkspaceShell>
      <header className="app-header">
        <Link href="/app" className="wordmark">
          FENNLO
        </Link>
      </header>
      <ThreadNav threads={threads} accountEmail={user.email} />
      <main className="thread-main">{children}</main>
    </WorkspaceShell>
  );
}
