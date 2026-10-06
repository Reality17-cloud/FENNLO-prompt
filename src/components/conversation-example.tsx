import { ClientAvatar } from "./client-identity";
import { FennloDecision } from "./fennlo-decision";
export function ConversationExample() {
  return (
    <section
      className="conversation-example"
      aria-label="Example client thread"
    >
      <header className="example-header">
        <div className="example-identity">
          <ClientAvatar name="Sarah Chen" />
          <div>
            <strong>Sarah Chen</strong>
            <h2>Acme Website</h2>
          </div>
        </div>
        <span className="example-caption">Fictional example</span>
      </header>
      <p className="thread-goal">Close the project without discounting.</p>
      <div className="latest-update">
        <div className="event-heading">Latest update · 2:18 PM</div>
        <p className="reality-text">
          I like it, but I need approval from my manager first.
        </p>
      </div>
      <FennloDecision
        result={{
          next_move:
            "Find out exactly what the manager needs to approve the project.",
          send: "Thanks, Sarah. What would your manager need from us to review and approve the project?",
          why: "The offer itself is not currently the active problem. Manager approval is now the constraint.",
        }}
      />
    </section>
  );
}
