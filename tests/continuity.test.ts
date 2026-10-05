import { describe, expect, it, vi } from "vitest";
import {
  determineTransition,
  snapshotSchema,
  FENNLO_SYSTEM,
} from "../src/lib/formation";
import fixtures from "./fixtures/formation-cases.json";
const first = fixtures[0],
  second = fixtures[1];
describe("bounded Formation continuity", () => {
  it("sends new Reality, persistent goal and only a bounded previous state", async () => {
    const before = snapshotSchema.parse(first.mock_result);
    const generate = vi.fn(async () => ({
      ...second.mock_result,
      formed: [first.conversation, second.conversation],
    }));
    const result = await determineTransition(
      first.goal,
      second.conversation,
      before,
      { generate },
    );
    expect(generate.mock.calls[0]).toHaveLength(1);
    expect(generate).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining(FENNLO_SYSTEM),
        data: {
          user_goal: first.goal,
          client_conversation: second.conversation,
          previous_state: before,
        },
      }),
    );
    expect(result.snapshot.formed).toEqual([
      first.conversation,
      second.conversation,
    ]);
    expect(Object.keys(result.result).sort()).toEqual([
      "next_move",
      "send",
      "why",
    ]);
  });
  it.each([
    { ...second.mock_result, owner_id: "override" },
    { ...second.mock_result, goal: "override" },
    {
      ...second.mock_result,
      formed: ["The client is desperate and has a budget of $5000."],
    },
    { ...second.mock_result, send: "Why? When?" },
    { ...second.mock_result, current_state: "x".repeat(1201) },
  ])("rejects unverified state mutations %#", async (raw) => {
    await expect(
      determineTransition(
        first.goal,
        second.conversation,
        snapshotSchema.parse(first.mock_result),
        { generate: async () => raw },
      ),
    ).rejects.toMatchObject({ code: "AI_INVALID_RESPONSE" });
  });
  it("does not accept a prior AI summary as evidence", async () => {
    const before = {
      ...snapshotSchema.parse(first.mock_result),
      current_state: "Client will pay today.",
    };
    await expect(
      determineTransition(first.goal, second.conversation, before, {
        generate: async () => ({
          ...second.mock_result,
          formed: [before.current_state],
        }),
      }),
    ).rejects.toMatchObject({ code: "AI_INVALID_RESPONSE" });
  });
  it("preserves a WAIT null message", async () => {
    const wait = fixtures.find((f) => f.id === "wait-for-review")!;
    const r = await determineTransition(wait.goal, wait.conversation, null, {
      generate: async () => wait.mock_result,
    });
    expect(r.result.send).toBeNull();
  });
});
