import { clientInitials } from "@/lib/client-display";

export function ClientAvatar({
  name,
  size = "normal",
}: {
  name?: string | null;
  size?: "normal" | "small";
}) {
  return (
    <span
      className={`client-avatar ${size === "small" ? "avatar-small" : ""}`}
      aria-hidden="true"
    >
      {clientInitials(name)}
    </span>
  );
}
