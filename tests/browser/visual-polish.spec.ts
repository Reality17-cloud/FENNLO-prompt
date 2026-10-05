import { test, expect, type Page, type TestInfo } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import fixtures from "../fixtures/formation-cases.json" with { type: "json" };

const first = fixtures[0],
  second = fixtures[1];
async function signup(page: Page) {
  const response = await page.request.post("/api/auth/signup", {
    data: {
      email: `${randomUUID()}@example.test`,
      password: "a memorable test passphrase",
    },
  });
  expect(response.status()).toBe(201);
}
async function createThread(page: Page, title = "Acme Website") {
  await page.goto("/app");
  await page.getByLabel("Client name", { exact: true }).fill("Sarah Chen");
  await page
    .getByLabel("What are you working on?", { exact: false })
    .fill(title);
  await page.getByLabel("What are you trying to achieve?").fill(first.goal);
  await page.getByRole("button", { name: "Start conversation" }).click();
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
}
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(() => {
      const main = document.querySelector(".thread-main");
      return (
        document.documentElement.scrollWidth <= window.innerWidth &&
        (!main || main.scrollWidth <= main.clientWidth)
      );
    }),
  ).toBe(true);
}
async function capture(page: Page, info: TestInfo, name: string) {
  await page.evaluate(() => document.fonts.ready);
  await noOverflow(page);
  await page.screenshot({
    path: resolve(
      `../fennlo-relationship-review/${name}-${info.project.name}.png`,
    ),
    fullPage: true,
    scale: "css",
  });
}

test("one fictional client interaction and all landing CTAs lead to signup", async ({
  page,
}) => {
  await page.goto("/");
  const preview = page.getByRole("region", { name: "Example client thread" });
  await expect(preview.getByText("Fictional example")).toBeVisible();
  await expect(
    preview.getByText("The price is a little high.", { exact: true }),
  ).toBeVisible();
  await expect(preview.locator(".client-event")).toHaveCount(1);
  await expect(preview.locator(".formation-result")).toHaveCount(1);
  await expect(preview.locator("nav, textarea")).toHaveCount(0);
  await expect(preview.getByText("Sarah Chen", { exact: true })).toBeVisible();
  await expect(preview.getByText("10:42 AM", { exact: true })).toBeVisible();
  await page
    .getByRole("link", { name: "Start with your first client" })
    .click();
  await expect(page).toHaveURL(/\/signup$/);
  await page.goto("/");
  const links = page.getByRole("link", { name: "Get started" });
  for (let i = 0; i < 2; i++) {
    await links.nth(i).click();
    await expect(
      page.getByRole("heading", { name: "Create account", exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
    await page.goto("/");
  }
  await page
    .getByRole("link", { name: "Sign in", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "Sign in", exact: true }),
  ).toBeVisible();
});

test("composer preserves Enter, expands for multiline input, and submits explicitly without shifting controls", async ({
  page,
}) => {
  await signup(page);
  await createThread(page);
  const input = page.getByLabel("Client update", { exact: true });
  const submit = page.getByRole("button", {
    name: "Find next move",
    exact: true,
  });
  await expect(submit).toBeDisabled();
  await input.fill(first.conversation);
  await input.press("End");
  await input.press("Enter");
  await expect(input).toHaveValue(`${first.conversation}\n`);
  await expect(page.locator(".timeline-turn")).toHaveCount(0);
  const before = (await input.boundingBox())!.height;
  await input.fill(
    Array.from({ length: 8 }, (_, i) => `Client context line ${i + 1}`).join(
      "\n",
    ),
  );
  expect((await input.boundingBox())!.height).toBeGreaterThan(before);
  await input.fill(first.conversation);
  const box = (await submit.boundingBox())!;
  await input.press("Control+Enter");
  const pending = page.getByRole("button", {
    name: "Determining…",
    exact: true,
  });
  await expect(pending).toBeDisabled();
  const busyBox = (await pending.boundingBox())!;
  expect(Math.abs(busyBox.width - box.width)).toBeLessThanOrEqual(1);
  expect(Math.abs(busyBox.height - box.height)).toBeLessThanOrEqual(1);
  await expect(
    page.getByText(first.mock_result.send!, { exact: true }),
  ).toBeVisible();
  await expect(input).toHaveValue("");
  await expect(input).toBeEnabled();
  await noOverflow(page);
});

test("mobile drawer traps focus, Escape restores focus, and selected thread is clear", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signup(page);
  await createThread(page);
  const toggle = page.getByRole("button", { name: "Clients", exact: true });
  await toggle.click();
  const drawer = page.getByRole("dialog", { name: "Client navigation" });
  await expect(drawer).toBeVisible();
  await expect(
    drawer.getByRole("link", {
      name: "Sarah Chen — Acme Website",
      exact: true,
    }),
  ).toHaveAttribute("aria-current", "page");
  await expect(
    drawer.getByRole("button", { name: "Close client navigation" }),
  ).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(
    drawer.getByRole("link", { name: "Terms", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    drawer.getByRole("button", { name: "Close client navigation" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(drawer).not.toBeVisible();
  await expect(toggle).toBeFocused();
  await toggle.click();
  await drawer.getByRole("link", { name: "New client", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Start with a client." }),
  ).toBeVisible();
  await expect(drawer).not.toBeVisible();
});

test("rendered states for desktop and mobile visual review", async ({
  page,
}, info) => {
  test.setTimeout(60000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await capture(page, info, "landing");
  await page.goto("/signup");
  await capture(page, info, "signup");
  await page.goto("/signin");
  await capture(page, info, "signin");
  await signup(page);
  await page.goto("/app");
  await expect(
    page.getByRole("heading", { name: "Start with a client." }),
  ).toBeVisible();
  await expect(page.locator(".timeline-turn")).toHaveCount(0);
  await capture(page, info, "empty-account");
  await createThread(page);
  await expect(
    page.getByRole("heading", { name: "What has happened so far?" }),
  ).toBeVisible();
  await capture(page, info, "new-thread");
  await page
    .getByLabel("Client update", { exact: true })
    .fill(first.conversation);
  await page
    .getByRole("button", { name: "Find next move", exact: true })
    .click();
  await expect(
    page.getByText(first.mock_result.send!, { exact: true }),
  ).toBeVisible();
  await expect(
    page.locator(".timeline-turn").last().locator(".next-operation"),
  ).toBeInViewport({ ratio: 1 });
  await capture(page, info, "one-result");
  await expect(
    page.locator(".client-event .client-name").last(),
  ).toBeInViewport({ ratio: 1 });
  await expect(
    page.getByRole("button", { name: "Copy", exact: true }).last(),
  ).toBeInViewport({ ratio: 1 });
  await page
    .getByLabel("Client update", { exact: true })
    .fill(second.conversation);
  await page
    .getByRole("button", { name: "Find next move", exact: true })
    .click();
  await expect(
    page.getByText(second.mock_result.send!, { exact: true }),
  ).toBeVisible();
  await expect(
    page.locator(".timeline-turn").last().locator(".next-operation"),
  ).toBeInViewport({ ratio: 1 });
  await expect(page.locator(".app-header")).toBeInViewport({ ratio: 1 });
  await expect(
    page.getByRole("heading", { name: "Acme Website", exact: true }),
  ).toBeInViewport({ ratio: 1 });
  await capture(page, info, "continuing-thread");
  await expect(
    page.locator(".client-event .client-name").last(),
  ).toBeInViewport({ ratio: 1 });
  await expect(
    page.getByRole("button", { name: "Copy", exact: true }).last(),
  ).toBeInViewport({ ratio: 1 });
  if (info.project.name === "mobile") {
    await page.getByRole("button", { name: "Clients", exact: true }).click();
    await capture(page, info, "drawer");
    await page.keyboard.press("Escape");
  }
  await page.getByRole("link", { name: "Account", exact: true }).click();
  await capture(page, info, "account");
});

test("public and working layouts fit every requested width with usable composer and copy controls", async ({
  page,
}, info) => {
  test.setTimeout(60000);
  // One pass covers the full width matrix; both projects cover all interaction states above.
  test.skip(info.project.name !== "desktop", "Width matrix runs once.");
  await signup(page);
  await createThread(page);
  const threadUrl = page.url();
  await page
    .getByLabel("Client update", { exact: true })
    .fill(first.conversation);
  await page
    .getByRole("button", { name: "Find next move", exact: true })
    .click();
  await expect(
    page.getByText(first.mock_result.send!, { exact: true }),
  ).toBeVisible();
  for (const width of [320, 375, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: width >= 1024 ? 1050 : 844 });
    await page.goto("/");
    await capture(page, info, `landing-${width}`);
    await page.goto(threadUrl);
    await expect(
      page.getByRole("heading", { name: "Acme Website", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(first.mock_result.send!, { exact: true }),
    ).toBeVisible();
    const input = page.getByLabel("Client update", { exact: true });
    await input.fill("The client has replied.");
    await expect(
      page.getByRole("button", { name: "Find next move", exact: true }),
    ).toBeInViewport();
    await page
      .context()
      .grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.getByRole("button", { name: "Copy", exact: true }).click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      first.mock_result.send,
    );
    await expect(
      page.getByRole("heading", { name: "Acme Website", exact: true }),
    ).toBeInViewport();
    await capture(page, info, `workspace-${width}`);
  }
});
