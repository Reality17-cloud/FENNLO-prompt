import { PublicFooter, PublicHeader } from "@/components/public-shell";
export default function Privacy() {
  return (
    <>
      <PublicHeader />
      <main className="legal-page">
        <p className="eyebrow">Privacy</p>
        <h1>Your client information</h1>
        <p>
          Fennlo stores your email, a scrypt password hash, session token
          hashes, and client threads in PostgreSQL. Threads include your goal,
          client Reality, result messages, timestamps, and bounded internal
          Formation snapshots. The database keeps this information across
          reloads and server restarts.
        </p>
        <h2>Access and processing</h2>
        <p>
          Thread access requires your account session and is scoped to the
          account that created it. There are no public thread links. Authorized
          service operators and database administrators can access stored data
          for operation and support; it is not end-to-end encrypted.
        </p>
        <p>
          When you request a next move, Fennlo sends your thread goal, a bounded
          previous Formation state, and the new Reality to its configured
          external model provider. The intended deployment uses Alibaba Cloud
          Model Studio’s Singapore OpenAI-compatible endpoint with a configured
          Qwen model. Provider retention and processing are governed by that
          provider’s terms and your operator’s configuration. Fennlo makes no
          claim that provider inputs are excluded from training or retained for
          a particular period.
        </p>
        <h2>Cookies and logs</h2>
        <p>
          A necessary HttpOnly session cookie keeps you signed in for up to 12
          hours. Fennlo uses no advertising or analytics trackers. Application
          failure logs contain fixed error codes, not client conversations or
          passwords. Infrastructure access logs and provider logs may be managed
          separately by the deployment operator.
        </p>
        <p>
          Rate-limit records contain account IDs or hashed identifiers and
          counters. Old records are cleaned up during successful authentication
          after their one-day window. Passwords and raw session tokens are not
          stored in the database.
        </p>
        <h2>Deletion</h2>
        <p>
          Deleting your account requires your password and explicit
          confirmation. It removes your user record, sessions, threads, Reality,
          results, and Formation snapshots from the active application database
          in one cascading operation. Aggregate or hashed rate-limit records
          expire separately. Copies in infrastructure backups and external
          provider records are not deleted by that operation; their retention
          depends on the operator and provider policies.
        </p>
        <h2>Use only information you can share</h2>
        <p>
          Only submit client information you have permission to process with
          Fennlo and its external provider. Avoid unnecessary sensitive personal
          information. Review any generated message before sending it.
        </p>
        <p className="small muted">
          Policy describes this free beta implementation. Updated October 5,
          2026.
        </p>
      </main>
      <PublicFooter />
    </>
  );
}
