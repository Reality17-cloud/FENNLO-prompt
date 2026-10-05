import { ClientAvatar } from "./client-identity";
import { ClientEvent } from "./client-event";
import { FennloDecision, FennloIdentity } from "./fennlo-decision";
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
      <div className="example-conversation">
        <ClientEvent
          name="Sarah Chen"
          text="The price is a little high."
          exampleTime="10:42 AM"
        />
        <div className="fennlo-turn">
          <FennloIdentity />
          <FennloDecision
            result={{
              next_move:
                "Find out what is actually preventing the decision before changing the offer.",
              send: "Before we change the price, may I ask what the main concern is right now?",
              why: "Understanding the concern gives you a useful next step before changing the offer.",
            }}
          />
        </div>
      </div>
    </section>
  );
}
