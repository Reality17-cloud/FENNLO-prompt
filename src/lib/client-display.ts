export function clientDisplayName(name: string | null | undefined) {
  return name?.trim() || "Client";
}

export function clientInitials(name: string | null | undefined) {
  const words = clientDisplayName(name).normalize("NFC").split(/\s+/u);
  const initial = (word: string) =>
    Array.from(word)[0]?.toLocaleUpperCase("en") ?? "";
  return initial(words[0]) + (words.length > 1 ? initial(words.at(-1)!) : "");
}

export function clientPlaceholder(name: string | null | undefined) {
  const first = name?.trim().split(/\s+/u)[0];
  return first
    ? `Paste ${first}’s latest reply or tell Fennlo what changed…`
    : "Paste the client’s latest reply or tell Fennlo what changed…";
}

export function conversationTime(value: string, now = new Date()) {
  const date = new Date(value);
  const time = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  if (date.toDateString() === now.toDateString()) return time;
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString())
    return `Yesterday · ${time}`;
  const day = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(date.getFullYear() === now.getFullYear()
      ? {}
      : { year: "numeric" as const }),
  });
  return `${day} · ${time}`;
}
