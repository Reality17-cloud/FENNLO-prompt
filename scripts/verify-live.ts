// Opt-in only: npm run verify:live -- --confirm-free-quota --case price-uncertain
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { determineNextMove } from "../src/lib/formation";
import { createProvider } from "../src/lib/provider";
import { AppError } from "../src/lib/errors";

const args = process.argv.slice(2);
if (
  !args.includes("--confirm-free-quota") ||
  (!args.includes("--case") && !args.includes("--all"))
) {
  console.error(
    "Explicit opt-in required: --confirm-free-quota --case CASE_ID (one call), or --confirm-free-quota --all (one call per fixture). Verify active free quota and enable Free Quota Only first.",
  );
  process.exit(1);
}
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const fixtures: {
  id: string;
  conversation: string;
  goal: string;
  behavior: string;
  expected: string;
}[] = JSON.parse(
  await readFile(
    new URL("../tests/fixtures/formation-cases.json", import.meta.url),
    "utf8",
  ),
);
const selected = args.includes("--all")
  ? fixtures
  : fixtures.filter((f) => f.id === args[args.indexOf("--case") + 1]);
if (!selected.length) {
  console.error("Unknown case ID. See tests/fixtures/formation-cases.json.");
  process.exit(1);
}
const results = [];
let failures = 0;
for (const fixture of selected) {
  try {
    const result = await determineNextMove(
      { conversation: fixture.conversation, goal: fixture.goal },
      createProvider(),
    );
    results.push({
      id: fixture.id,
      expected_behavior: fixture.expected,
      result,
      strategic_review: "REQUIRES_HUMAN_REVIEW",
    });
    console.log(`${fixture.id}: validated; strategic review required.`);
  } catch (error) {
    failures++;
    const code = error instanceof AppError ? error.code : "UNEXPECTED_ERROR";
    results.push({ id: fixture.id, error: code });
    console.error(`${fixture.id}: ${code}`);
  }
}
await mkdir("work", { recursive: true });
await writeFile("work/live-results.json", JSON.stringify(results, null, 2));
console.log(
  "Saved public results and review rubric to work/live-results.json. No retry or paid fallback was used.",
);
if (failures) process.exitCode = 1;
