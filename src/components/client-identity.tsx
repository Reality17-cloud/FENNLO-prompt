import { clientInitials } from "@/lib/client-display";
import { avatarTone } from "./avatar-palette";

export function ClientAvatar({
  name,
  size = "normal",
}: {
  name?: string | null;
  size?: "normal" | "small";
}) {
  return (
    <span
      className={`client-avatar avatar-${avatarTone(name)} ${size === "small" ? "avatar-small" : ""}`}
      aria-hidden="true"
    >
      {clientInitials(name)}
    </span>
  );
}
