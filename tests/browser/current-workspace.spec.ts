import { test, expect, type Page, type TestInfo } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import fixtures from "../fixtures/formation-cases.json" with { type: "json" };
const [price, approval] = fixtures;
async function client(page: Page) {
  expect(
    (
      await page.request.post("/api/auth/signup", {
        data: {
          email: `${randomUUID()}@example.test`,
          password: "a memorable test passphrase",
        },
      })
    ).status(),
  ).toBe(201);
  const { thread } = await (
    await page.request.post("/api/threads", {
      data: {
        clientName: "Sarah Chen",
        title: "Acme Website",
        goal: price.goal,
      },
    })
  ).json();
  await page.goto(`/app/${thread.id}`);
  return thread;
}
async function send(page: Page, reality: string) {
  await page.getByLabel("Client update", { exact: true }).fill(reality);
  await page
    .getByRole("button", { name: "Find next move", exact: true })
    .click();
}
async function capture(page: Page, info: TestInfo, name: string) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      document
        .getAnimations()
        .filter(
          (animation) => animation.effect?.getTiming().iterations !== Infinity,
        )
        .map((animation) => animation.finished.catch(() => {})),
    );
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
  });
  // Give the compositor a settled frame after fonts and layout complete.
  await page.waitForTimeout(250);
  await page.screenshot({
    path: resolve(`../fennlo-final-review/${name}-${info.project.name}.png`),
    fullPage: true,
    scale: "css",
  });
}

test("current situation, Moments and goal changes preserve truth and the draft", async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const thread = await client(page);
  await send(page, price.conversation);
  await expect(page.locator(".client-message")).toHaveText(
    price.mock_result.send!,
  );
  await send(page, approval.conversation);
  await expect(page.locator(".client-message")).toHaveText(
    approval.mock_result.send!,
  );
  await page.locator(".thread-client-name").click();
  await expect(page.locator(".current-moment")).toHaveCount(1);
  await expect(page.locator(".reality-text")).toHaveText(approval.conversation);
  await expect(page.locator(".reality-composer")).not.toHaveClass(/expanded/);
  const currentLocus = (await page.locator(".latest-update").boundingBox())!;
  await capture(page, info, "sarah-current");
  const input = page.getByLabel("Client update", { exact: true });
  await input.fill("A draft, not a saved update.");
  await page.getByRole("button", { name: "Moments", exact: true }).click();
  const moments = page.getByRole("dialog", { name: "Moments", exact: true });
  await expect(moments.locator(".moment-choice")).toHaveCount(2);
  await capture(page, info, "moments");
  await moments
    .getByRole("button", {
      name: new RegExp(price.conversation.replaceAll(".", "\\.")),
    })
    .click();
  await expect(
    page.getByText("Viewing earlier moment", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".client-message")).toHaveText(
    price.mock_result.send!,
  );
  await expect(page.locator(".historical-note")).toContainText(price.goal);
  await expect(input).toHaveValue("A draft, not a saved update.");
  expect(
    Math.abs(
      (await page.locator(".latest-update").boundingBox())!.y - currentLocus.y,
    ),
  ).toBeLessThan(1);
  await capture(page, info, "earlier-moment");
  await page
    .getByRole("button", { name: "Return to latest", exact: true })
    .click();
  await expect(page.locator(".client-message")).toHaveText(
    approval.mock_result.send!,
  );
  await expect(input).toHaveValue("A draft, not a saved update.");
  const before = await (
    await page.request.get(`/api/threads/${thread.id}`)
  ).json();
  expect(before.turns).toHaveLength(2);
  await page.getByRole("button", { name: "Client options" }).click();
  await page.getByRole("menuitem", { name: "Edit goal", exact: true }).click();
  await page
    .getByLabel("Goal", { exact: true })
    .fill("Agree a later review date.");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByText("Goal updated", { exact: true })).toBeVisible();
  await expect(page.locator(".client-message")).toHaveCount(0);
  await expect(page.locator(".next-operation")).toContainText("for this goal");
  await expect(input).toHaveValue("A draft, not a saved update.");
});

test("composer expands upward and collapses without moving its bottom edge", async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await client(page);
  const composer = page.locator(".reality-composer");
  const input = page.getByLabel("Client update", { exact: true });
  await expect(composer).toBeVisible();
  const rest = (await composer.boundingBox())!;
  expect(rest.height).toBeLessThanOrEqual(64);
  await input.focus();
  const focused = (await composer.boundingBox())!;
  expect(focused.height).toBeGreaterThan(rest.height + 40);
  expect(
    Math.abs(focused.y + focused.height - rest.y - rest.height),
  ).toBeLessThan(1);
  await expect(input).toBeFocused();
  await capture(page, info, "composer-focused");
  await input.fill("Line one\nLine two\nLine three");
  await expect(input).toBeFocused();
  expect(
    (
      await (
        await page.request.get(`/api/threads/${page.url().split("/").at(-1)}`)
      ).json()
    ).turns,
  ).toEqual([]);
  await input.fill("");
  await page.locator(".thread-client-name").click();
  expect((await composer.boundingBox())!.height).toBeLessThanOrEqual(64);
});

test("unsaved draft is not Reality and verified results replace the same loci", async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const thread = await client(page);
  await send(page, price.conversation);
  await expect(page.locator(".client-message")).toHaveText(
    price.mock_result.send!,
  );
  const original = (await page.locator(".latest-update").boundingBox())!;
  let releaseRequest!: () => void;
  let releaseResponse!: () => void;
  const requestGate = new Promise<void>((resolve) => {
    releaseRequest = resolve;
  });
  const responseGate = new Promise<void>((resolve) => {
    releaseResponse = resolve;
  });
  await page.route("**/api/threads/*/turns", async (route) => {
    await requestGate;
    const response = await route.fetch();
    await responseGate;
    await route.fulfill({ response });
  });
  try {
    await send(page, approval.conversation);
    await expect(page.locator(".determining")).toBeVisible();
    await expect(page.locator(".reality-text")).toHaveText(price.conversation);
    await expect(page.locator(".client-message")).toHaveCount(0);
    await capture(page, info, "determining");
    releaseRequest();
    await expect(page.locator(".reality-text")).toHaveText(
      approval.conversation,
      { timeout: 10000 },
    );
    expect(
      Math.abs(
        (await page.locator(".latest-update").boundingBox())!.y - original.y,
      ),
    ).toBeLessThan(1);
    const saved = await (
      await page.request.get(`/api/threads/${thread.id}`)
    ).json();
    expect(saved.turns.at(-1).reality).toBe(approval.conversation);
    releaseResponse();
    await expect(page.locator(".client-message")).toHaveText(
      approval.mock_result.send!,
    );
    await expect(page.getByLabel("Client update", { exact: true })).toHaveValue(
      "",
    );
    await page.locator(".thread-client-name").click();
    if (info.project.name === "desktop") {
      for (const width of [1440, 1024, 390, 320]) {
        await page.setViewportSize({
          width,
          height: width >= 1024 ? 960 : 844,
        });
        await expect(page.locator(".reality-text")).toBeInViewport();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        await capture(page, info, `sarah-${width}`);
      }
    }
  } finally {
    releaseRequest();
    releaseResponse();
  }
});

test("Moments loads bounded earlier history without replacing the latest saved situation", async ({
  page,
}) => {
  test.setTimeout(60000);
  const thread = await client(page);
  let version = thread.version;
  for (let i = 0; i < 52; i++) {
    const response = await page.request.patch(`/api/threads/${thread.id}`, {
      data: { goal: `Goal revision ${i + 1}`, version },
    });
    expect(response.status()).toBe(200);
    version = (await response.json()).thread.version;
  }
  await page.reload();
  await page.getByRole("button", { name: "Moments", exact: true }).click();
  const moments = page.getByRole("dialog", { name: "Moments", exact: true });
  await expect(moments.locator(".moment-choice")).toHaveCount(50);
  const historyRequest = /\/api\/threads\/[^/?]+\?before=/;
  await page.route(historyRequest, (route) => route.abort());
  await moments
    .getByRole("button", { name: "Load earlier turns", exact: true })
    .click();
  await expect(moments.getByRole("alert")).toContainText(
    "Unable to load earlier turns",
  );
  await page.unroute(historyRequest);
  await moments
    .getByRole("button", { name: "Load earlier turns", exact: true })
    .click();
  await expect(moments.locator(".moment-choice")).toHaveCount(52);
  await moments
    .getByRole("button", { name: "Close dialog", exact: true })
    .click();
  await expect(page.locator(".reality-text")).toHaveText("Goal revision 52");
});
