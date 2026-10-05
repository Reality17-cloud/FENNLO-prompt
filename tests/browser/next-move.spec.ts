import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import fixtures from "../fixtures/formation-cases.json" with { type: "json" };
const password = "a memorable test passphrase";
const first = fixtures[0],
  second = fixtures[1];
async function signup(page: Page) {
  const email = `${randomUUID()}@example.test`;
  const res = await page.request.post("/api/auth/signup", {
    data: { email, password },
  });
  expect(res.status()).toBe(201);
  return email;
}
async function newThread(
  page: Page,
  title = "Acme website",
  goal = first.goal,
) {
  await page.goto("/app");
  await page.getByRole("button", { name: "New client", exact: true }).click();
  await page.getByLabel("Client name", { exact: true }).fill("Sarah Chen");
  await page
    .getByLabel("What are you working on?", { exact: false })
    .fill(title);
  await page.getByLabel("What are you trying to achieve?").fill(goal);
  await page.getByRole("button", { name: "Start conversation" }).click();
  await expect(page).toHaveURL(/\/app\/[a-f0-9-]+$/);
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
  return page.url().split("/").at(-1)!;
}
async function determine(page: Page, reality = first.conversation) {
  await page.getByLabel("Client update", { exact: true }).fill(reality);
  await page
    .getByRole("button", { name: "Find next move", exact: true })
    .click();
}
async function nav(page: Page) {
  const toggle = page.getByRole("button", { name: /^Clients/ });
  if (await toggle.isVisible()) await toggle.click();
}
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}

test("public page, legal pages and unauthorized app redirect", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "Client conversations, one move ahead.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Example client thread" }),
  ).toBeVisible();
  await noOverflow(page);
  await page.getByRole("link", { name: "Privacy", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your client information" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Terms", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Using Fennlo" }),
  ).toBeVisible();
  await page.goto("/app");
  await expect(page).toHaveURL(/\/signin$/);
  expect((await page.request.get("/api/threads")).status()).toBe(401);
  expect(
    (
      await page.request.post("/api/next-move", {
        data: { conversation: first.conversation, goal: first.goal },
      })
    ).status(),
  ).toBe(401);
});

test("signup, signout, invalid signin, valid signin and cookie security", async ({
  page,
}) => {
  const email = `${randomUUID()}@example.test`;
  await page.goto("/signup");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page).toHaveURL(/\/app$/);
  const cookie = (await page.context().cookies()).find(
    (c) => c.name === "fennlo_session",
  )!;
  expect(cookie.httpOnly).toBe(true);
  expect(cookie.sameSite).toBe("Lax");
  expect(cookie.value).toMatch(/^[a-f0-9]{64}$/);
  const accountToggle = page.getByRole("button", {
    name: "Clients",
    exact: true,
  });
  if (
    !(await page
      .getByRole("link", { name: "Account", exact: true })
      .isVisible()) &&
    (await accountToggle.isVisible())
  )
    await accountToggle.click();
  await page.getByRole("link", { name: "Account", exact: true }).click();
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.locator(".account-email")).toHaveText(email);
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/signin$/);
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill("invalid password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.locator(".error[role=alert]")).toContainText(
    "Email or password is incorrect",
  );
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/app$/);
});

test("persistent thread, result, copy, Why, reload and continued Formation", async ({
  page,
}, testInfo) => {
  await signup(page);
  const id = await newThread(page);
  await determine(page);
  await expect(
    page.getByRole("button", { name: "Determining…", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText(first.mock_result.send!, { exact: true }),
  ).toBeVisible();
  const detail = await (await page.request.get(`/api/threads/${id}`)).json();
  expect(detail.turns).toHaveLength(1);
  expect(JSON.stringify(detail)).not.toMatch(
    /current_state|next_formation|owner_id|password_hash/,
  );
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("button", { name: "Copy reply", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Copied", exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    first.mock_result.send,
  );
  await page.getByText("Why this", { exact: true }).click();
  await expect(
    page.getByText(first.mock_result.why, { exact: true }),
  ).toBeVisible();
  await page.getByText("Why this", { exact: true }).click();
  await noOverflow(page);
  await page.screenshot({
    path: resolve(`../fennlo-persistent-${testInfo.project.name}.png`),
    fullPage: true,
  });
  await page.reload();
  await expect(
    page.getByText(first.mock_result.send!, { exact: true }),
  ).toBeVisible();
  await determine(page, "__continue__");
  await expect(
    page.getByText(second.mock_result.send!, { exact: true }),
  ).toBeVisible();
  expect(
    (await (await page.request.get(`/api/threads/${id}`)).json()).thread.goal,
  ).toBe(first.goal);
  await expect(
    page.getByRole("button", { name: "Copy reply", exact: true }),
  ).toHaveCount(2);
});

test("two independent threads, thread switching, goal editing, rename, archive and reopen", async ({
  page,
}) => {
  await signup(page);
  const id = await newThread(page);
  await determine(page);
  await expect(
    page.getByText(first.mock_result.send!, { exact: true }),
  ).toBeVisible();
  await newThread(page, "Video project", "Keep the relationship.");
  await expect(
    page.getByText(first.mock_result.send!, { exact: true }),
  ).toHaveCount(0);
  await nav(page);
  await page
    .getByRole("link", { name: "Sarah Chen — Acme website", exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(id));
  await expect(
    page.getByText(first.mock_result.send!, { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Client options" }).click();
  await page
    .getByRole("menuitem", { name: "Rename project", exact: true })
    .click();
  await page
    .getByLabel("What are you working on?", { exact: true })
    .fill("Acme revised");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await page
    .getByRole("button", { name: "Client options", exact: true })
    .click();
  await page.getByRole("menuitem", { name: "Edit goal", exact: true }).click();
  await page
    .getByLabel("Goal", { exact: true })
    .fill("Keep the relationship but decline this project.");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(
    page.getByRole("heading", { name: "Acme revised" }),
  ).toBeVisible();
  await expect(page.getByText("Goal updated", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Client options" }).click();
  await page.getByRole("menuitem", { name: "Archive client" }).click();
  await expect(
    page.getByRole("dialog", { name: "Archive this client?" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Archive client", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Reopen thread" }),
  ).toBeVisible();
  await expect(page.getByLabel("Client update", { exact: true })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "Reopen thread" }).click();
  await expect(page.getByLabel("Client update", { exact: true })).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Acme revised" }),
  ).toBeVisible();
  await noOverflow(page);
});

test("another owner cannot read, update or infer from a private thread", async ({
  page,
  browser,
}) => {
  await signup(page);
  const id = await newThread(page);
  const other = await browser.newContext();
  const p = await other.newPage();
  try {
    await signup(p);
    expect((await p.request.get(`/api/threads/${id}`)).status()).toBe(404);
    expect(
      (
        await p.request.patch(`/api/threads/${id}`, {
          data: { title: "stolen", version: 0 },
        })
      ).status(),
    ).toBe(404);
    expect(
      (
        await p.request.post(`/api/threads/${id}/turns`, {
          data: { id: randomUUID(), reality: first.conversation },
        })
      ).status(),
    ).toBe(404);
    await p.goto(`/app/${id}`);
    await expect(
      p.getByRole("heading", { name: "Thread unavailable" }),
    ).toBeVisible();
  } finally {
    await other.close();
  }
});

test("WAIT has no manufactured message or copy action", async ({ page }) => {
  const wait = fixtures.find((f) => f.id === "wait-for-review")!;
  await signup(page);
  await newThread(page);
  await determine(page, wait.conversation);
  await expect(
    page.getByText("No message yet.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Copy reply", exact: true }),
  ).toHaveCount(0);
  await page.getByText("Why this", { exact: true }).click();
  await expect(
    page.getByText(wait.mock_result.why, { exact: true }),
  ).toBeVisible();
});

for (const [input, expected] of [
  ["__quota__", "quota is exhausted"],
  ["__malformed__", "verify a usable next move"],
  ["__timeout__", "took too long"],
])
  test(`provider ${input} saves Reality and exposes a safe retry`, async ({
    page,
  }) => {
    await signup(page);
    const id = await newThread(page);
    await determine(page, input);
    await expect(page.locator(".error[role=alert]")).toContainText(expected);
    await expect(
      page.getByRole("button", { name: "Retry next move" }),
    ).toBeVisible();
    await expect(
      page.getByLabel("Client update", { exact: true }),
    ).toBeDisabled();
    await page.reload();
    await expect(
      page.getByRole("button", { name: "Retry next move" }),
    ).toBeVisible();
    const detail = await (await page.request.get(`/api/threads/${id}`)).json();
    expect(detail.turns).toHaveLength(1);
    expect(detail.turns[0].status).toBe("FAILED");
    expect(detail.turns[0].reality).toBe(input);
  });

test("retry succeeds without a duplicate turn", async ({ page }) => {
  await signup(page);
  const id = await newThread(page);
  await determine(page, `__retry__${randomUUID()}`);
  await expect(
    page.getByRole("button", { name: "Retry next move" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Retry next move" }).click();
  await expect(
    page.getByText(first.mock_result.send!, { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Client update", { exact: true })).toBeEnabled();
  expect(
    (await (await page.request.get(`/api/threads/${id}`)).json()).turns,
  ).toHaveLength(1);
});

test("long conversation, goal, output and 320px viewport have no overflow", async ({
  page,
}) => {
  await signup(page);
  await newThread(
    page,
    "Very long client thread ".repeat(5),
    "Goal ".repeat(800),
  );
  await determine(page, "__long__" + "Client context ".repeat(1300));
  await expect(
    page.getByRole("button", { name: "Copy reply", exact: true }),
  ).toBeVisible();
  await noOverflow(page);
  await page.setViewportSize({ width: 320, height: 780 });
  await noOverflow(page);
  await page.getByText("Why this", { exact: true }).click();
  await noOverflow(page);
});

test("copy failure offers manual copy", async ({ page }) => {
  await signup(page);
  await newThread(page);
  await determine(page);
  await expect(
    page.getByRole("button", { name: "Copy reply", exact: true }),
  ).toBeVisible();
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async () => {
          throw new Error("denied");
        },
      },
      configurable: true,
    }),
  );
  await page.getByRole("button", { name: "Copy reply", exact: true }).click();
  await expect(
    page.getByText(
      "Copy is unavailable. Select the message and copy it manually.",
    ),
  ).toBeVisible();
});

test("Chinese goal and English message remain separate", async ({ page }) => {
  const f = fixtures.find((f) => f.id === "chinese-goal-english-client")!;
  await signup(page);
  await newThread(page, "Multilingual", f.goal);
  await determine(page, f.conversation);
  await expect(
    page.getByText(f.mock_result.next_move, { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(f.mock_result.send!, { exact: true }),
  ).toBeVisible();
});

test("network error preserves unsaved input and supports retry", async ({
  page,
}) => {
  await signup(page);
  await newThread(page);
  await page.route("**/api/threads/*/turns", (route) => route.abort());
  await determine(page);
  await expect(page.locator(".error[role=alert]")).toContainText(
    "connection was interrupted",
  );
  await expect(page.getByLabel("Client update", { exact: true })).toHaveValue(
    first.conversation,
  );
  await page.unroute("**/api/threads/*/turns");
  await page
    .getByRole("button", { name: "Find next move", exact: true })
    .click();
  await expect(
    page.getByText(first.mock_result.send!, { exact: true }),
  ).toBeVisible();
});

test("account deletion confirmation erases history and invalidates another session", async ({
  page,
  browser,
}) => {
  const email = await signup(page);
  const id = await newThread(page);
  await determine(page);
  await expect(
    page.getByRole("button", { name: "Copy reply", exact: true }),
  ).toBeVisible();
  const other = await browser.newContext();
  try {
    const res = await other.request.post(
      "http://127.0.0.1:3100/api/auth/signin",
      { data: { email, password } },
    );
    expect(res.status()).toBe(200);
    const accountToggle = page.getByRole("button", {
      name: "Clients",
      exact: true,
    });
    if (
      !(await page
        .getByRole("link", { name: "Account", exact: true })
        .isVisible()) &&
      (await accountToggle.isVisible())
    )
      await accountToggle.click();
    await page.getByRole("link", { name: "Account", exact: true }).click();
    await page
      .getByRole("button", { name: "Delete account", exact: true })
      .click();
    await expect(page.getByLabel("Type DELETE to confirm")).toBeVisible();
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(page.getByLabel("Type DELETE to confirm")).toHaveCount(0);
    await page
      .getByRole("button", { name: "Delete account", exact: true })
      .click();
    await page.getByLabel("Confirm your password").fill(password);
    await page.getByLabel("Type DELETE to confirm").fill("DELETE");
    await page
      .getByRole("button", { name: "Permanently delete account" })
      .click();
    await expect(page).toHaveURL("/");
    expect(
      (
        await other.request.get(`http://127.0.0.1:3100/api/threads/${id}`)
      ).status(),
    ).toBe(401);
  } finally {
    await other.close();
  }
});

test("cross-origin mutations are rejected before creating threads", async ({
  page,
}) => {
  await signup(page);
  const response = await page.request.post("/api/threads", {
    headers: { Origin: "https://evil.example" },
    data: { goal: first.goal },
  });
  expect(response.status()).toBe(403);
  expect(
    (await (await page.request.get("/api/threads")).json()).threads,
  ).toEqual([]);
});

// Successful transport with invalid data must not expose schema dumps or internals.
test("invalid thread response fails safely and reloads the persisted result", async ({
  page,
}) => {
  await signup(page);
  await newThread(page);
  await page.route("**/api/threads/*/turns", async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    body.turns.at(-1).result.internal_reason = "private reasoning";
    await route.fulfill({ response, json: body });
  });
  await determine(page);
  await expect(page.locator(".error[role=alert]")).toContainText(
    "invalid thread",
  );
  await expect(
    page.getByText("private reasoning", { exact: false }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Copy reply", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Client update", { exact: true })).toBeEnabled();
});

test("expired session redirects API-dependent work to signin", async ({
  page,
}) => {
  await signup(page);
  await newThread(page);
  await page.context().clearCookies();
  await determine(page);
  await expect(page).toHaveURL(/\/signin$/);
});
