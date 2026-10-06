import type { ThreadTurn } from "@/lib/workspace-schema";
import { Modal } from "./modal";
import { ConversationTime } from "./conversation-time";

export function Moments({
  turns,
  selected,
  older,
  loading,
  error,
  onOlder,
  onSelect,
  onClose,
}: {
  turns: ThreadTurn[];
  selected?: string;
  older: boolean;
  loading: boolean;
  error: string;
  onOlder: () => void;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal title="Moments" busy={false} onClose={onClose}>
      <p className="modal-description">
        Earlier situations, in their original context.
      </p>
      <div className="moments-list">
        {[...turns].reverse().map((turn, index) => (
          <button
            className="moment-choice"
            key={turn.id}
            aria-pressed={turn.id === selected}
            onClick={() => {
              onSelect(turn.id);
              onClose();
            }}
          >
            <span className="moment-meta">
              <ConversationTime value={turn.createdAt} />
              <span>
                {index === 0
                  ? "Latest"
                  : turn.kind === "GOAL"
                    ? "Goal updated"
                    : turn.status === "FAILED"
                      ? "Needs retry"
                      : "Earlier update"}
              </span>
            </span>
            <span className="moment-excerpt">{turn.reality}</span>
          </button>
        ))}
        {!turns.length && (
          <p className="muted">Saved updates will appear here.</p>
        )}
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {older && (
        <button className="secondary" disabled={loading} onClick={onOlder}>
          {loading ? "Loading…" : "Load earlier turns"}
        </button>
      )}
    </Modal>
  );
}
