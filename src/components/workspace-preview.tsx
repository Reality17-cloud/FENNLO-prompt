import { Result } from "./result";
import { Icon } from "./ui";

// Fictional public examples, never inserted into an authenticated workspace.
const examples = [
  {
    reality: "The price is a little high.",
    result: {
      next_move: "Determine what remains unresolved before changing the price.",
      send: "Before we change the price, may I ask what the main concern is right now?",
      why: "The concern has not been established. Clarifying it avoids changing an offer the client may already accept.",
    },
  },
  {
    reality: "It’s actually fine. I just need approval from my manager.",
    result: {
      next_move: "Help the client get internal approval.",
      send: "Would a concise summary of the scope, timeline, and expected outcome help your manager make a decision?",
      why: "The price is accepted. Internal approval is now what needs to happen before the project can move forward.",
    },
  },
];

export function WorkspacePreview() {
  return (
    <section className="workspace-preview" aria-label="Example client thread">
      <div className="preview-topbar">
        <span className="wordmark">FENNLO</span>
        <span className="small muted">
          Example workspace · fictional client
        </span>
      </div>
      <div className="preview-body">
        <aside className="preview-sidebar" aria-label="Example threads">
          <div className="preview-new">
            <Icon name="plus" /> New client
          </div>
          <p className="nav-label">Active threads</p>
          <div className="preview-nav-item selected">Acme Website</div>
          <div className="preview-nav-item">Landing Page Client</div>
          <div className="preview-nav-item">Brand Project</div>
          <span className="preview-sidebar-note small muted">
            Client Next Move
          </span>
        </aside>
        <div className="preview-thread">
          <header className="preview-thread-header">
            <h2>Acme Website</h2>
            <div className="goal-line">
              <span>Goal</span>
              <p>Close the project without discounting.</p>
            </div>
          </header>
          <div className="preview-timeline">
            {examples.map((example, i) => (
              <article className="timeline-turn" key={example.reality}>
                <div className="reality-turn">
                  <div className="turn-meta">
                    <span className="eyebrow">Client Reality</span>
                    <span>{i === 0 ? "Earlier" : "Latest reply"}</span>
                  </div>
                  <p>{example.reality}</p>
                </div>
                <div className="fennlo-turn">
                  <span className="author-label">FENNLO</span>
                  <Result result={example.result} />
                </div>
              </article>
            ))}
          </div>
          <div className="preview-composer">
            <span>New Reality</span>
            <p>Paste the client’s latest reply or tell Fennlo what changed…</p>
            <div>
              <span className="small muted">
                The goal stays with this thread.
              </span>
              <span className="preview-submit">
                <Icon name="arrow" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
