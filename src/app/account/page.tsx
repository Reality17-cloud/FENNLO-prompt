import Link from "next/link";
import { pageAccount } from "@/lib/auth";
import { AccountControls } from "@/components/account-controls";
export const dynamic = "force-dynamic";
export default async function Account() {
  const user = await pageAccount();
  return (
    <>
      <header className="public-header">
        <Link className="wordmark" href="/app">
          FENNLO
        </Link>
        <Link href="/app">Back to workspace</Link>
      </header>
      <main className="account-page">
        <h1>Account</h1>
        <p className="eyebrow">Email</p>
        <p className="account-email">{user.email}</p>
        <AccountControls />
        <p className="small muted">
          Read our <Link href="/privacy">Privacy policy</Link> for provider and
          backup retention details.
        </p>
      </main>
    </>
  );
}
