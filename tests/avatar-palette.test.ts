import { expect, it } from "vitest";
import { avatarTone } from "../src/components/avatar-palette";
it("assigns a stable soft tone to the client, regardless of spacing, case or Unicode normalization", () => {
  for (const name of [
    "Sarah Chen",
    "Daniel Tan",
    "Melissa",
    "Élodie Laurent",
    "李 明",
  ]) {
    expect(["sage", "blue", "sand", "clay", "lilac"]).toContain(
      avatarTone(name),
    );
    expect(avatarTone(name)).toBe(
      avatarTone(` ${name.toLocaleUpperCase("en").replaceAll(" ", "   ")} `),
    );
    expect(avatarTone(name)).toBe(avatarTone(name.normalize("NFD")));
  }
  expect(
    new Set(["Sarah Chen", "Daniel Tan", "Melissa"].map(avatarTone)).size,
  ).toBeGreaterThan(1);
  expect(avatarTone(null)).toBe("neutral");
});
