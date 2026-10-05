import { PublicFooter, PublicHeader } from "@/components/public-shell";
export default function Terms() {
  return (
    <>
      <PublicHeader />
      <main className="legal-page">
        <p className="eyebrow">Terms</p>
        <h1>Using Fennlo</h1>
        <p>
          Fennlo Client Next Move is a free beta tool for determining one next
          move in a client situation. Create an account, keep each situation in
          its own thread, and provide accurate Reality and a goal.
        </p>
        <h2>Your responsibilities</h2>
        <p>
          You must have permission to submit the information you provide and to
          have it processed by the configured model provider. Keep your password
          private. Do not abuse the service, bypass account access or rate
          limits, submit unlawful content, or use another person’s account
          without authorization.
        </p>
        <h2>Review the result</h2>
        <p>
          Generated results can be incorrect or incomplete. You decide what to
          do and what to send. Fennlo does not send messages to clients,
          guarantee a commercial outcome, or replace professional advice.
        </p>
        <h2>Beta availability</h2>
        <p>
          The beta has no billing or paid fallback. Provider availability, free
          quota, rate limits, and maintenance may prevent determinations.
          Features can change and availability is not guaranteed. Keep separate
          copies of information you need to retain.
        </p>
        <h2>Your data and account</h2>
        <p>
          See the Privacy policy for storage and processing. You may sign out or
          delete your account through Account. Account deletion permanently
          removes owned data from the active application database, subject to
          the backup and provider limitations described there.
        </p>
        <p className="small muted">Updated October 5, 2026.</p>
      </main>
      <PublicFooter />
    </>
  );
}
