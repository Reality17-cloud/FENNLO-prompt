import type { ThreadTurn } from "@/lib/workspace-schema";
import { Result } from "./result";
import { LoadingIndicator } from "./ui";
import { ClientEvent } from "./client-event";
import { ConversationTime } from "./conversation-time";

export function ThreadEntry({
  turn,
  clientName,
  active,
  disabled,
  onRetry,
}: {
  turn: ThreadTurn;
  clientName: string | null;
  active: boolean;
  disabled: boolean;
  onRetry: () => void;
}) {
  return (
    <article className="timeline-turn">
      {turn.kind === "GOAL" ? (
        <div className="goal-event">
          <div className="event-heading">
            <span>Goal updated</span>
            <ConversationTime value={turn.createdAt} />
          </div>
          <p>{turn.reality}</p>
          <details>
            <summary>Previous goal</summary>
            <p>{turn.goalAtTurn}</p>
          </details>
        </div>
      ) : (
        <>
          <ClientEvent
            name={clientName}
            text={turn.reality}
            timestamp={turn.createdAt}
          />
          <div className="fennlo-turn">
            <span className="author-label">Fennlo</span>
            {turn.result ? (
              <Result result={turn.result} />
            ) : turn.status === "FAILED" ? (
              <div className="turn-failure">
                <p>{turn.error}</p>
                <p className="small muted">
                  Your update is saved. Retry to continue from the last verified
                  state.
                </p>
                {active && (
                  <button
                    className="secondary compact"
                    disabled={disabled}
                    onClick={onRetry}
                  >
                    Retry next move
                  </button>
                )}
              </div>
            ) : (
              <p className="loading-line" role="status">
                <LoadingIndicator />
                Determining the next move…
              </p>
            )}
          </div>
        </>
      )}
    </article>
  );
}
