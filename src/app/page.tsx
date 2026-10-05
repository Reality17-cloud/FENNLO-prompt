import Link from "next/link";
import { PublicHeader, PublicFooter } from "@/components/public-shell";
export default function Home() {
  return (
    <>
      <PublicHeader />
      <main className="landing">
        <div className="landing-intro">
          <p className="eyebrow">Client Next Move</p>
          <h1>
            Client conversations,
            <br />
            one move ahead.
          </h1>
          <p className="lead">
            Paste what your client said. Fennlo determines what should happen
            next and gives you the message to send.
          </p>
          <div className="actions">
            <Link className="button" href="/signup">
              Get started <span aria-hidden="true">→</span>
            </Link>
            <Link className="text-link" href="/signin">
              Sign in
            </Link>
          </div>
          <p className="small muted">Free beta</p>
        </div>
        <section className="preview" aria-label="Example client thread">
          <div className="preview-header">
            <span>Acme website</span>
            <span className="small muted">Example</span>
          </div>
          <p className="preview-goal">
            Goal: Close the project without discounting.
          </p>
          <div className="preview-reality">
            <span className="eyebrow">Client Reality</span>
            <p>“The price is a little high.”</p>
          </div>
          <div className="preview-result">
            <span className="eyebrow">Next move</span>
            <p>Determine what remains unresolved before changing the price.</p>
            <div className="message-surface">
              <span className="eyebrow">Message</span>
              <p>
                Before we change the price, may I ask what the main concern is
                right now?
              </p>
            </div>
            <p className="small muted">
              The actual blocker has not been established.
            </p>
          </div>
        </section>
        <div className="landing-note">
          <h2>A place to continue the conversation.</h2>
          <p>
            Your goal stays with the client thread. Add the next reply or a
            change in the situation, and work from what has actually happened.
          </p>
        </div>
      </main>
      <PublicFooter />
    </>
  );
}
