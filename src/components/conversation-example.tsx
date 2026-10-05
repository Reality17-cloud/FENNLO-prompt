import { ClientEvent } from "./client-event";
import { Result } from "./result";

export function ConversationExample() {
  return (
    <section
      className="conversation-example"
      aria-label="Example client thread"
    >
      <header className="example-header">
        <h2>Acme Website</h2>
        <span>Fictional example</span>
      </header>
      <ClientEvent
        name="Sarah Chen"
        text="The price is a little high."
        exampleTime="10:42 AM"
      />
      <div className="fennlo-turn">
        <span className="author-label">Fennlo</span>
        <Result
          result={{
            next_move:
              "Before changing the price, find out what is actually preventing the decision.",
            send: "Before we change the price, may I ask what the main concern is right now?",
            why: "Understanding the concern gives you a useful next step before changing the offer.",
          }}
        />
      </div>
    </section>
  );
}
