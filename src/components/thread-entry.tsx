import type { ThreadTurn } from "@/lib/workspace-schema";
import { Result } from "./result";
import { LoadingIndicator } from "./ui";

export function ThreadEntry({
  turn,
  active,
  disabled,
  onRetry,
}: {
  turn: ThreadTurn;
  active: boolean;
  disabled: boolean;
  onRetry: () => void;
}) {
  return (
    <article className="timeline-turn">
      {turn.kind === "GOAL" ? (
        <div className="goal-event">
          <span className="eyebrow">Goal updated</span>
          <p>{turn.reality}</p>
          <details>
            <summary>Previous goal</summary>
            <p>{turn.goalAtTurn}</p>
          </details>
        </div>
      ) : (
        <>
          <div className="reality-turn">
            <div className="turn-meta">
              <span className="eyebrow">You · Client Reality</span>
              <time dateTime={turn.createdAt}>
                {new Date(turn.createdAt).toLocaleDateString("en", {
                  month: "short",
                  day: "numeric",
                })}
              </time>
            </div>
            <p>{turn.reality}</p>
          </div>
          <div className="fennlo-turn">
            <span className="author-label">FENNLO</span>
            {turn.result ? (
              <Result result={turn.result} />
            ) : turn.status === "FAILED" ? (
              <div className="turn-failure">
                <p>{turn.error}</p>
                <p className="small muted">
                  Your Reality is saved. Retry to continue from the last
                  verified state.
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
