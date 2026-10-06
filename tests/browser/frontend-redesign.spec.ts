import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import fixtures from "../fixtures/formation-cases.json" with { type: "json" };

async function relationship(page: Page) {
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
        goal: fixtures[0].goal,
      },
    })
  ).json();
  await page.goto(`/app/${thread.id}`);
  return thread.id as string;
}
async function menu(page: Page) {
  await page
    .getByRole("button", { name: "Client options", exact: true })
    .click();
}
async function clients(page: Page) {
  const toggle = page.getByRole("button", { name: "Clients", exact: true });
  if (await toggle.isVisible()) await toggle.click();
}

test("client options support keyboard navigation, focused editors, Escape and archive cancellation", async ({
  page,
}) => {
  const id = await relationship(page);
  await menu(page);
  await expect(
    page.getByRole("menuitem", { name: "Edit goal", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(
    page.getByRole("menuitem", { name: "Rename project", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("dialog", { name: "Rename project", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Project", { exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("dialog", { name: "Rename project", exact: true }),
  ).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Client options", exact: true }),
  ).toBeFocused();
  await menu(page);
  await page
    .getByRole("menuitem", { name: "Archive client", exact: true })
    .click();
  const confirmation = page.getByRole("dialog", {
    name: "Archive this client?",
    exact: true,
  });
  await expect(
    confirmation.getByRole("button", { name: "Cancel", exact: true }),
  ).toBeFocused();
  await confirmation
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  expect(
    (await (await page.request.get(`/api/threads/${id}`)).json()).thread.status,
  ).toBe("ACTIVE");
  await expect(page.getByLabel("Client update", { exact: true })).toBeEnabled();
  await menu(page);
  await page.getByRole("menuitem", { name: "Edit goal", exact: true }).click();
  await expect(page.getByLabel("Goal", { exact: true })).toBeFocused();
  await page
    .getByLabel("Goal", { exact: true })
    .fill("Keep the relationship without discounting.");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  const after = await (await page.request.get(`/api/threads/${id}`)).json();
  expect(after.thread.clientName).toBe("Sarah Chen");
  expect(after.thread.title).toBe("Acme Website");
  expect(after.turns[0].kind).toBe("GOAL");
});

test("client identity colors are consistent across navigation, header and reload", async ({
  page,
}) => {
  await relationship(page);
  const color = await page
    .locator(".thread-identity .client-avatar")
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  const size = await page
    .locator(".thread-identity .client-avatar")
    .boundingBox();
  expect(size!.width).toBeGreaterThanOrEqual(36);
  expect(size!.width).toBeLessThanOrEqual(40);
  await page
    .getByLabel("Client update", { exact: true })
    .fill(fixtures[0].conversation);
  await page
    .getByRole("button", { name: "Find next move", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Copy reply", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".latest-update .client-avatar")).toHaveCount(0);
  await clients(page);
  const link = page.getByRole("link", {
    name: "Sarah Chen — Acme Website",
    exact: true,
  });
  await expect(link).toHaveAttribute("aria-current", "page");
  await link.hover();
  expect(
    await link
      .locator(".client-avatar")
      .evaluate((el) => getComputedStyle(el).backgroundColor),
  ).toBe(color);
  const avatar = await link.locator(".client-avatar").boundingBox();
  expect(avatar!.width).toBeGreaterThanOrEqual(28);
  expect(avatar!.width).toBeLessThanOrEqual(34);
  const account = page.getByRole("link", { name: "Account", exact: true });
  expect((await account.boundingBox())!.y).toBeGreaterThan(
    (await link.boundingBox())!.y,
  );
  await page.reload();
  expect(
    await page
      .locator(".thread-identity .client-avatar")
      .evaluate((el) => getComputedStyle(el).backgroundColor),
  ).toBe(color);
});

test("failed generation keeps its recovery path and disables goal edits in the new menu", async ({
  page,
}) => {
  await relationship(page);
  await page.getByLabel("Client update", { exact: true }).fill("__quota__");
  await page
    .getByRole("button", { name: "Find next move", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Retry next move", exact: true }),
  ).toBeVisible();
  await menu(page);
  await expect(
    page.getByRole("menuitem", { name: "Edit goal", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("menuitem", { name: "Rename project", exact: true }),
  ).toBeEnabled();
  await page.keyboard.press("Escape");
  await expect(
    page.getByLabel("Client update", { exact: true }),
  ).toBeDisabled();
});
