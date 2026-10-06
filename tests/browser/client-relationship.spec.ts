import { test, expect, type Page, type TestInfo } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import fixtures from "../fixtures/formation-cases.json" with { type: "json" };

const first = fixtures[0];
async function signup(page: Page) {
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
}
async function create(page: Page, clientName = "Sarah Chen") {
  await page.goto("/app");
  await page.getByRole("button", { name: "New client", exact: true }).click();
  await page.getByLabel("Client name", { exact: true }).fill(clientName);
  await page.getByLabel("Project", { exact: false }).fill("Acme Website");
  await page.getByLabel("Goal").fill(first.goal);
  await page.getByRole("button", { name: "Start conversation" }).click();
  await expect(page).toHaveURL(/\/app\/[a-f0-9-]+$/);
}
async function screenshot(page: Page, info: TestInfo, name: string) {
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
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  // Allow the compositor to paint settled fonts before the review capture.
  await page.waitForTimeout(250);
  await page.screenshot({
    path: resolve(`../fennlo-final-review/${name}-${info.project.name}.png`),
    fullPage: true,
    scale: "css",
  });
}

test("empty account, named creation, client switcher, timestamp and explicit client rename", async ({
  page,
}) => {
  await signup(page);
  await page.goto("/app");
  expect(
    (await (await page.request.get("/api/threads")).json()).threads,
  ).toEqual([]);
  await expect(page.locator(".nav-client")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Start with a client." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "New client", exact: true }).click();
  await expect(page.getByLabel("Client name", { exact: true })).toHaveAttribute(
    "required",
    "",
  );
  await create(page);
  const id = page.url().split("/").at(-1)!;
  await expect(page.locator(".thread-identity .client-avatar")).toHaveText(
    "SC",
  );
  const input = page.getByLabel("Client update", { exact: true });
  await expect(input).toHaveAttribute(
    "placeholder",
    "What changed with Sarah?",
  );
  await input.fill(first.conversation);
  await page
    .getByRole("button", { name: "Find next move", exact: true })
    .click();
  await expect(page.locator(".event-heading")).toContainText("Latest update");
  await expect(page.locator(".latest-update .client-avatar")).toHaveCount(0);
  const before = await (await page.request.get(`/api/threads/${id}`)).json();
  await expect(page.locator(".latest-update time")).toHaveAttribute(
    "datetime",
    before.turns[0].createdAt,
  );
  await expect(page.locator(".latest-update time")).toHaveText(
    /\d{1,2}:\d{2} [AP]M/,
  );
  await expect(
    page.getByText("Suggested reply", { exact: true }),
  ).toBeVisible();
  expect(await page.locator(".why").getAttribute("open")).toBeNull();
  await expect(page.getByText("Client Reality", { exact: true })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "Client options" }).click();
  await page.getByRole("menuitem", { name: "Edit client name" }).click();
  await page.getByLabel("Client name", { exact: true }).fill("Daniel Tan");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.locator(".thread-client-name")).toHaveText("Daniel Tan");
  await expect(page.locator(".thread-identity .client-avatar")).toHaveText(
    "DT",
  );
  await expect(input).toHaveAttribute(
    "placeholder",
    "What changed with Daniel?",
  );
  await page.reload();
  const after = await (await page.request.get(`/api/threads/${id}`)).json();
  expect(after.thread.clientName).toBe("Daniel Tan");
  expect(after.thread.goal).toBe(before.thread.goal);
  expect(after.turns).toEqual(before.turns);
  const toggle = page.getByRole("button", { name: "Clients", exact: true });
  if (await toggle.isVisible()) await toggle.click();
  const link = page.getByRole("link", {
    name: "Daniel Tan — Acme Website",
    exact: true,
  });
  await expect(link).toHaveAttribute("aria-current", "page");
  await expect(link.locator(".client-avatar")).toHaveText("DT");
});

test("existing unnamed thread has a safe fallback and can gain a real client name", async ({
  page,
}) => {
  await signup(page);
  const { thread } = await (
    await page.request.post("/api/threads", {
      data: { title: "Existing project", goal: first.goal },
    })
  ).json();
  expect(thread.clientName).toBeNull();
  await page.goto(`/app/${thread.id}`);
  await expect(page.locator(".thread-client-name")).toHaveText("Client");
  await expect(page.locator(".thread-identity .client-avatar")).toHaveText("C");
  await expect(
    page.getByLabel("Client update", { exact: true }),
  ).toHaveAttribute("placeholder", "What changed with the client?");
  await page.getByRole("button", { name: "Client options" }).click();
  await page.getByRole("menuitem", { name: "Edit client name" }).click();
  await page.getByLabel("Client name", { exact: true }).fill("Melissa");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.locator(".thread-client-name")).toHaveText("Melissa");
  await expect(page.locator(".thread-identity .client-avatar")).toHaveText("M");
  expect(
    (await (await page.request.get(`/api/threads/${thread.id}`)).json()).turns,
  ).toEqual([]);
});

test("long client update and suggested reply remain readable and copyable", async ({
  page,
}, info) => {
  test.setTimeout(60000);
  await signup(page);
  await create(page, "Sarah Alexandra Chen".repeat(5));
  await page
    .getByLabel("Client update", { exact: true })
    .fill("__long__" + "Client context from the call. ".repeat(550));
  await page
    .getByRole("button", { name: "Find next move", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Copy reply", exact: true }),
  ).toBeVisible();
  await page.locator(".latest-update").evaluate((el) => {
    const viewport = el.closest(".timeline")!;
    viewport.scrollTop = 0;
  });
  await screenshot(page, info, "long-client-message");
  await page.locator(".message-surface").evaluate((el) => {
    const viewport = el.closest(".timeline")!;
    viewport.scrollTop +=
      el.getBoundingClientRect().top - viewport.getBoundingClientRect().top;
  });
  await screenshot(page, info, "long-suggested-reply");
  const copy = page.getByRole("button", {
    name: "Copy reply",
    exact: true,
  });
  await expect(copy).toBeInViewport({ ratio: 1 });
  // Copy must remain reachable while reading, without jumping to the end.
  await page.locator(".timeline").evaluate((el) => {
    el.scrollTop += 240;
  });
  await expect(copy).toBeInViewport({ ratio: 1 });
  const edge = await page.locator(".message-heading").evaluate((el) => ({
    toolbar: el.getBoundingClientRect().top,
    timeline: el.closest(".timeline")!.getBoundingClientRect().top,
  }));
  expect(Math.abs(edge.toolbar - edge.timeline)).toBeLessThan(1);
  await screenshot(page, info, "long-reply-reading");
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await copy.click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    "Thank you for sharing the context. ".repeat(68).trim(),
  );
  await expect(page.locator(".thread-client-name")).toBeInViewport();
  await expect(
    page.getByLabel("Client update", { exact: true }),
  ).toBeInViewport();
});

test("mobile visual viewport shrink keeps client context and composer above the keyboard", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signup(page);
  await create(page);
  const input = page.getByLabel("Client update", { exact: true });
  await input.fill("Sarah replied after the call.");
  await input.focus();
  await page.evaluate(() => {
    Object.defineProperty(window.visualViewport!, "height", {
      configurable: true,
      value: 360,
    });
    window.visualViewport!.dispatchEvent(new Event("resize"));
  });
  await expect(page.locator(".app-shell")).toHaveClass(/keyboard-open/);
  const submit = page.getByRole("button", {
    name: "Find next move",
    exact: true,
  });
  expect(
    (await submit.boundingBox())!.y + (await submit.boundingBox())!.height,
  ).toBeLessThanOrEqual(360);
  expect(
    (await page.locator(".thread-client-name").boundingBox())!.y,
  ).toBeGreaterThanOrEqual(0);
  await expect(input).toBeFocused();
  await screenshot(page, info, "keyboard-open");
  await page.evaluate(() => {
    delete (window.visualViewport as unknown as { height?: number }).height;
    window.visualViewport!.dispatchEvent(new Event("resize"));
  });
  await expect(page.locator(".app-shell")).not.toHaveClass(/keyboard-open/);
  await expect(
    page.getByRole("button", { name: "Clients", exact: true }),
  ).toBeVisible();
});
