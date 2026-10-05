import Link from "next/link";
import { PublicHeader, PublicFooter } from "@/components/public-shell";
import { WorkspacePreview } from "@/components/workspace-preview";
import { Icon } from "@/components/ui";

export default function Home() {
  return (
    <>
      <PublicHeader />
      <main className="landing">
        <section className="landing-intro">
          <div>
            <p className="eyebrow">Client Next Move</p>
            <h1>
              Client conversations,
              <br />
              one move ahead.
            </h1>
          </div>
          <div className="landing-description">
            <p className="lead">
              Keep the goal and current client reality together. Decide what
              should happen next, as the conversation continues.
            </p>
            <div className="actions">
              <Link className="button" href="/signup">
                Get started <Icon name="arrow" />
              </Link>
              <Link className="text-link" href="/signin">
                Sign in
              </Link>
            </div>
          </div>
        </section>
        <WorkspacePreview />
        <section className="continuity" aria-labelledby="continuity-title">
          <div className="continuity-intro">
            <p className="eyebrow">One thread. A continuing conversation.</p>
            <h2 id="continuity-title">The conversation continues.</h2>
            <p className="muted">
              The goal stays. Each new reply changes what needs to happen next.
            </p>
          </div>
          <div className="continuity-thread">
            <div className="continuity-goal">
              <span className="eyebrow">Persistent goal</span>
              <p>Close the project without discounting.</p>
            </div>
            <div className="continuity-step">
              <span className="continuity-marker" aria-hidden="true" />
              <div>
                <span className="small muted">Client reply</span>
                <p>“The price is a little high.”</p>
                <span className="continuity-move">
                  Next move <Icon name="arrow" /> Clarify the concern.
                </span>
              </div>
            </div>
            <div className="continuity-step">
              <span className="continuity-marker" aria-hidden="true" />
              <div>
                <span className="small muted">New client reply</span>
                <p>“I just need my manager’s approval.”</p>
                <span className="continuity-move">
                  Next move <Icon name="arrow" /> Support internal approval.
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </>
  );
}
