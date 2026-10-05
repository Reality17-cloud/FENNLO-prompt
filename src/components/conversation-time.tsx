"use client";
import { useSyncExternalStore } from "react";
import { conversationTime } from "@/lib/client-display";

const subscribe = () => () => {};
const client = () => true;
const server = () => false;

export function ConversationTime({ value }: { value: string }) {
  const hydrated = useSyncExternalStore(subscribe, client, server);
  // Stable UTC markup on the server, then the reader's local calendar/time after hydration.
  const date = new Date(value);
  const label = hydrated
    ? conversationTime(value)
    : date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      });
  return (
    <time dateTime={value} title={hydrated ? date.toLocaleString() : value}>
      {label}
    </time>
  );
}
