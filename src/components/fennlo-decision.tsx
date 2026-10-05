import type { PublicNextMove } from "@/lib/schemas";
import { SuggestedReply } from "./suggested-reply";
import { Icon } from "./ui";

export function FennloIdentity() {
  return (
    <div className="fennlo-identity">
      <span aria-hidden="true">
        <Icon name="arrow" />
      </span>
      <span>Fennlo</span>
    </div>
  );
}
export function FennloDecision({ result }: { result: PublicNextMove }) {
  return (
    <div className="formation-result">
      <div className="next-operation">
        <span className="decision-label">Next move</span>
        <p>{result.next_move}</p>
      </div>
      {result.send !== null ? (
        <SuggestedReply message={result.send} />
      ) : (
        <p className="no-message">No message yet.</p>
      )}
      <details className="why">
        <summary>
          Why this
          <Icon name="arrow" />
        </summary>
        <p>{result.why}</p>
      </details>
    </div>
  );
}
