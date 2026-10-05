import { describe, expect, it } from "vitest";
import {
  clientDisplayName,
  clientInitials,
  clientPlaceholder,
  conversationTime,
} from "../src/lib/client-display";
import {
  createThreadSchema,
  updateThreadSchema,
  threadSchema,
} from "../src/lib/workspace-schema";

describe("client identity and conversation time", () => {
  it.each([
    ["Sarah Chen", "SC"],
    ["Daniel Tan", "DT"],
    ["Melissa", "M"],
    ["  Sarah   Mei Chen  ", "SC"],
    ["李 明", "李明"],
    ["Élodie Laurent", "ÉL"],
    [null, "C"],
  ])("derives initials for %s", (name, initials) => {
    expect(clientInitials(name)).toBe(initials);
  });
  it("keeps legacy clients anonymous and personalizes only a real name", () => {
    expect(clientDisplayName(null)).toBe("Client");
    expect(clientPlaceholder(null)).toBe(
      "Paste the client’s latest reply or tell Fennlo what changed…",
    );
    expect(clientPlaceholder(" Sarah Chen ")).toBe(
      "Paste Sarah’s latest reply or tell Fennlo what changed…",
    );
  });
  it("uses the reader's local day and time across month and year boundaries", () => {
    const now = new Date(2026, 0, 1, 14, 30);
    expect(
      conversationTime(new Date(2026, 0, 1, 10, 42).toISOString(), now),
    ).toBe("10:42 AM");
    expect(
      conversationTime(new Date(2025, 11, 31, 14, 18).toISOString(), now),
    ).toBe("Yesterday · 2:18 PM");
    expect(
      conversationTime(new Date(2025, 11, 29, 9, 0).toISOString(), now),
    ).toBe("Dec 29, 2025 · 9:00 AM");
    expect(
      conversationTime(
        new Date(2026, 9, 4, 9, 0).toISOString(),
        new Date(2026, 9, 6),
      ),
    ).toBe("Oct 4 · 9:00 AM");
  });
  it("accepts older requests and responses, trims names, and bounds the only new field", () => {
    expect(
      createThreadSchema.parse({ goal: "Close this project." }),
    ).not.toHaveProperty("clientName");
    expect(
      createThreadSchema.parse({
        clientName: " Sarah Chen ",
        goal: "Close this project.",
      }).clientName,
    ).toBe("Sarah Chen");
    expect(
      updateThreadSchema.parse({ clientName: "Daniel Tan", version: 0 })
        .clientName,
    ).toBe("Daniel Tan");
    for (const clientName of [" ", "a".repeat(121), null])
      expect(
        createThreadSchema.safeParse({
          clientName,
          goal: "Close this project.",
        }).success,
      ).toBe(false);
    expect(
      threadSchema.parse({
        id: "00000000-0000-4000-8000-000000000001",
        title: "Acme Website",
        goal: "Close this project.",
        status: "ACTIVE",
        version: 0,
        createdAt: "2026-10-04T10:00:00Z",
        updatedAt: "2026-10-04T10:00:00Z",
        processing: false,
      }).clientName,
    ).toBeNull();
  });
});
