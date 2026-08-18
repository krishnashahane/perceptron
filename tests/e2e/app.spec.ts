import { test, expect, type Page } from "@playwright/test";

const ROUTES = ["/command", "/graph", "/simulate", "/ingest", "/audit"];
const VIEWPORTS = [
  { w: 1440, h: 900 },
  { w: 1024, h: 768 },
  { w: 768, h: 1024 },
  { w: 390, h: 844 },
];

async function login(page: Page) {
  await page.goto("/");
  await page.getByPlaceholder("analyst").fill("admin");
  await page.getByPlaceholder("••••••••").fill("perceptron-admin");
  await page.getByRole("button", { name: /AUTHENTICATE/ }).click();
  await page.waitForURL("**/command");
}

test("login gate redirects unauthenticated users", async ({ page }) => {
  const res = await page.goto("/command");
  await page.waitForURL("**/?next=%2Fcommand");
  expect(res?.status()).toBeLessThan(500);
});

test("all routes load with no console errors and only 2xx/3xx responses", async ({ page }) => {
  const bad: string[] = [];
  const consoleErrors: string[] = [];
  page.on("response", (r) => {
    const s = r.status();
    if (s >= 400) bad.push(`${s} ${r.url()}`);
  });
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text());
  });

  await login(page);
  for (let i = 0; i < 3; i++) {
    for (const route of ROUTES) {
      await page.goto(route);
      await page.waitForLoadState("networkidle");
    }
  }
  expect(bad, `non-2xx responses:\n${bad.join("\n")}`).toEqual([]);
  expect(consoleErrors, `console errors:\n${consoleErrors.join("\n")}`).toEqual([]);
});

test("each route has a unique document title", async ({ page }) => {
  await login(page);
  const titles = new Set<string>();
  for (const route of ROUTES) {
    await page.goto(route);
    titles.add(await page.title());
  }
  expect(titles.size).toBe(ROUTES.length);
});

test("no horizontal overflow at any viewport", async ({ page }) => {
  await login(page);
  for (const route of ROUTES) {
    for (const v of VIEWPORTS) {
      await page.setViewportSize({ width: v.w, height: v.h });
      await page.goto(route);
      await page.waitForLoadState("networkidle");
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
      );
      expect(overflow, `horizontal overflow on ${route} @ ${v.w}px`).toBeFalsy();
    }
  }
});

test("clock never shows the dashed placeholder", async ({ page }) => {
  await login(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/command");
  await expect(page.locator("header")).not.toContainText("--:--:--");
});

test("EXIT clears the session and returns to the lock screen", async ({ page }) => {
  await login(page);
  await page.getByRole("button", { name: "EXIT" }).click();
  await page.waitForURL("**/");
  await expect(page.getByText(/session locked/i)).toBeVisible();
  // session gone: protected route bounces back to lock
  await page.goto("/command");
  await page.waitForURL(/\/\?next=/);
});
