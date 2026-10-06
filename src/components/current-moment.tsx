import type { ThreadTurn } from "@/lib/workspace-schema";
import { ConversationTime } from "./conversation-time";
import { FennloDecision } from "./fennlo-decision";
import { LoadingIndicator } from "./ui";

export function CurrentMoment({
  turn,
  determining,
  historical,
  active,
  disabled,
  onRetry,
}: {
  historical: boolean;
  turn?: ThreadTurn;
  determining: boolean;
  active: boolean;
  disabled: boolean;
  onRetry: () => void;
}) {
  return (
    <article className="current-moment">
      {turn && (
        <div className="latest-update">
          <div className="event-heading">
            <span>
              {turn.kind === "GOAL"
                ? "Goal updated"
                : historical
                  ? "Earlier update"
                  : "Latest update"}
            </span>
            <span aria-hidden="true">·</span>
            <ConversationTime value={turn.createdAt} />
          </div>
          <p className="reality-text">{turn.reality}</p>
          {turn.kind === "GOAL" && (
            <details className="why">
              <summary>Previous goal</summary>
              <p>{turn.goalAtTurn}</p>
            </details>
          )}
        </div>
      )}
      {determining || turn?.status === "PENDING" ? (
        <div className="next-operation determining" role="status">
          <span className="decision-label">Next move</span>
          <p className="loading-line">
            <LoadingIndicator />
            Determining the next move…
          </p>
          <span className="muted small">
            Your next move appears here when verified.
          </span>
        </div>
      ) : turn?.kind === "GOAL" ? (
        <div className="next-operation">
          <span className="decision-label">Next move</span>
          <p className="awaiting-update">
            Add a new update to determine the next move for this goal.
          </p>
        </div>
      ) : turn?.result ? (
        <FennloDecision result={turn.result} historical={historical} />
      ) : turn?.status === "FAILED" ? (
        <div className="next-operation turn-failure">
          <span className="decision-label">Next move</span>
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
      ) : null}
    </article>
  );
}
