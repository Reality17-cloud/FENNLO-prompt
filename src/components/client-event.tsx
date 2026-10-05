import { ClientAvatar } from "./client-identity";
import { ConversationTime } from "./conversation-time";
import { clientDisplayName } from "@/lib/client-display";

export function ClientEvent({
  name,
  text,
  timestamp,
  exampleTime,
}: {
  name?: string | null;
  text: string;
  timestamp?: string;
  exampleTime?: string;
}) {
  return (
    <div className="client-event">
      <ClientAvatar name={name} />
      <div className="client-event-body">
        <div className="client-event-heading">
          <span className="client-name">{clientDisplayName(name)}</span>
          {timestamp ? (
            <ConversationTime value={timestamp} />
          ) : (
            <span className="event-time">{exampleTime}</span>
          )}
        </div>
        <p>{text}</p>
      </div>
    </div>
  );
}
