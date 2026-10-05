import { describe, expect, it, vi } from "vitest";
import cases from "./fixtures/formation-cases.json";
import {
  determineNextMove,
  FENNLO_SYSTEM,
  nextMoveJsonSchema,
} from "../src/lib/formation";
import {
  internalNextMoveSchema,
  nextMoveInputSchema,
} from "../src/lib/schemas";
const input = { conversation: cases[0].conversation, goal: cases[0].goal };

describe("Formation boundary and deterministic product fixtures", () => {
  it.each(cases)(
    "$id selects one public operation through the provider boundary",
    async (fixture) => {
      const generate = vi.fn().mockResolvedValue(fixture.mock_result);
      const result = await determineNextMove(
        { conversation: fixture.conversation, goal: fixture.goal },
        { generate },
      );
      expect(Object.keys(result).sort()).toEqual(["next_move", "send", "why"]);
      expect(generate).toHaveBeenCalledOnce();
      expect(generate).toHaveBeenCalledWith({
        system: FENNLO_SYSTEM,
        schema: nextMoveJsonSchema,
        data: {
          client_conversation: fixture.conversation,
          user_goal: fixture.goal,
        },
      });
      if (
        ["DETERMINE", "CLARIFY", "RESPECT_AUTHORITY"].includes(fixture.behavior)
      )
        expect(result.send?.match(/[?？؟]/gu)).toHaveLength(1);
      if (fixture.behavior === "WAIT") expect(result.send).toBeNull();
      if (fixture.behavior === "PROCEED")
        expect(result.send).not.toMatch(/[?？؟]/u);
      if (fixture.behavior === "ESTABLISH_SCOPE")
        expect(result.send).toMatch(/additional scope|separately/u);
      if (fixture.id === "ready-payment")
        expect(result.send).toContain("https://example.com/pay/real-project");
      if (fixture.id === "payment-link-missing")
        expect(result.send).not.toMatch(/https?:|\[/u);
      if (fixture.id === "chinese-goal-english-client") {
        expect(result.next_move).toMatch(/\p{Script=Han}/u);
        expect(result.why).toMatch(/\p{Script=Han}/u);
        expect(result.send).not.toMatch(/\p{Script=Han}/u);
      }
      if (fixture.id === "manager-approval")
        expect(result.send).toMatch(/manager/u);
    },
  );

  it("rejects forged client evidence even when all output fields are valid", async () => {
    await expect(
      determineNextMove(input, {
        generate: async () => ({
          ...cases[0].mock_result,
          formed: ["Client can afford $50,000"],
        }),
      }),
    ).rejects.toMatchObject({ code: "AI_INVALID_RESPONSE" });
  });
  it("does not accept the user's goal as formed client evidence", async () => {
    await expect(
      determineNextMove(input, {
        generate: async () => ({
          ...cases[0].mock_result,
          formed: [cases[0].goal],
        }),
      }),
    ).rejects.toMatchObject({ code: "AI_INVALID_RESPONSE" });
  });
  it("rejects multiple questions rather than showing them as one move", async () => {
    await expect(
      determineNextMove(input, {
        generate: async () => ({
          ...cases[0].mock_result,
          send: "What is your budget? Who approves？",
        }),
      }),
    ).rejects.toMatchObject({ code: "AI_INVALID_RESPONSE" });
  });
  it.each([
    { ...cases[0].mock_result, hidden_extra: "private" },
    { ...cases[0].mock_result, next_move: "" },
    {
      ...cases[0].mock_result,
      formed: Array(9).fill("The price is a bit high."),
    },
    { ...cases[0].mock_result, send: "x".repeat(3001) },
    { ...cases[0].mock_result, missing: ["x".repeat(501)] },
  ])("rejects invalid internal output %#", async (raw) => {
    await expect(
      determineNextMove(input, { generate: async () => raw }),
    ).rejects.toMatchObject({ code: "AI_INVALID_RESPONSE" });
  });
  it("strictly validates input before calling a provider", async () => {
    const generate = vi.fn();
    await expect(
      determineNextMove({ conversation: " ", goal: "Close" }, { generate }),
    ).rejects.toThrow();
    expect(generate).not.toHaveBeenCalled();
    expect(
      nextMoveInputSchema.safeParse({
        conversation: "Hi",
        goal: "Reply",
        model: "override",
      }).success,
    ).toBe(false);
    expect(
      nextMoveInputSchema.safeParse({
        conversation: "x".repeat(20001),
        goal: "Reply",
      }).success,
    ).toBe(false);
    expect(
      nextMoveInputSchema.safeParse({
        conversation: "Hi",
        goal: "x".repeat(4001),
      }).success,
    ).toBe(false);
  });
  it("has a native schema matching the same local field and size limits", () => {
    expect(nextMoveJsonSchema.additionalProperties).toBe(false);
    expect(nextMoveJsonSchema.required?.slice().sort()).toEqual(
      Object.keys(internalNextMoveSchema.shape).sort(),
    );
  });
});
