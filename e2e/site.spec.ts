import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { countdown } from "../lib/demo";

const EXPLAINER_SLUGS = [
  "the-wash-sale",
  "short-vs-long-term",
  "across-accounts",
  "the-ira-trap",
  "options-can-trigger-it",
  "section-1256",
  "tax-loss-harvesting",
];

const isPhone = (page: Page) => (page.viewportSize()?.width ?? 1440) < 768;

/** After load: let hydration and the post-hydration layout measurements (convergence tail) run. */
async function settle(page: Page) {
  await page.waitForLoadState("load");
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 600)))));
}

test.describe("hero showcase", () => {
  test("the receipt prints and the WASH SALE stamp lands", async ({ page }) => {
    await page.goto("/");
    const showcase = page.locator("#showcase");
    // the one-time teaser slides to 100 shares and the receipt prints, once the showcase is seen
    await showcase.scrollIntoViewIfNeeded();
    await expect(showcase.getByText("Disallowed (wash sale)")).toBeVisible({ timeout: 10_000 });
    await expect(showcase.getByText("WASH SALE", { exact: true })).toBeVisible({ timeout: 10_000 });
    await expect(showcase.getByText("$1,840.00").first()).toBeVisible();
    // and the totals are announced
    await expect(showcase.locator("[aria-live]")).toContainText(/wash sale/i, { timeout: 10_000 });
  });

  test("under reduced motion the receipt is simply there", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.locator("#showcase").getByText("WASH SALE", { exact: true })).toBeVisible({ timeout: 5_000 });
  });
});

test.describe("features", () => {
  const CD = countdown();

  test("countdown ring and held days come from one value, and rest at the real numbers", async ({ page }) => {
    await page.goto("/");
    const days = page.getByTestId("countdown-days");
    const held = page.getByTestId("countdown-held");
    await days.scrollIntoViewIfNeeded();
    // While the ring fills, every frame's pair must add up to the full holding period.
    for (let i = 0; i < 12; i++) {
      const [d, h] = await page.evaluate(() =>
        ["countdown-days", "countdown-held"].map((id) => Number(document.querySelector(`[data-testid="${id}"]`)!.textContent!.match(/\d+/)![0])),
      );
      expect(d + h).toBe(CD.total);
      await page.waitForTimeout(120);
    }
    // Resting state.
    await expect(days).toHaveText(String(CD.daysAway), { timeout: 8_000 });
    await expect(held).toHaveText(`held ${CD.held} days`);
  });

  test("under reduced motion the countdown shows its resting state", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.getByTestId("countdown-days").scrollIntoViewIfNeeded();
    // The server renders the loop at t=0; the poster state lands once the page hydrates.
    await expect(page.getByTestId("countdown-days")).toHaveText(String(CD.daysAway), { timeout: 10_000 });
    await expect(page.getByTestId("countdown-held")).toHaveText(`held ${CD.held} days`);
  });
});

test.describe("convergence fallback", () => {
  test("Broker view / IRS view toggle switches the ledger", async ({ page }) => {
    // The fallback is what reduced-motion visitors, short screens and phones get.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/#how-it-works");
    const fallback = page.locator(".convergence-fallback");
    await expect(fallback).toBeVisible();

    const broker = fallback.getByRole("radio", { name: "Broker view" });
    const irs = fallback.getByRole("radio", { name: "IRS view" });
    await expect(broker).toHaveAttribute("aria-checked", "true");
    await expect(fallback.getByText("No issues found").first()).toBeVisible();

    await irs.click();
    await expect(irs).toHaveAttribute("aria-checked", "true");
    await expect(fallback.getByText("1 wash sale · $1,840 disallowed")).toBeVisible();

    // keyboard: arrow back to the broker view
    await irs.focus();
    await page.keyboard.press("ArrowLeft");
    await expect(broker).toHaveAttribute("aria-checked", "true");
  });
});

test.describe("real engine", () => {
  test("the WASM engine loads on an explainer page and the landing page doesn't fetch it", async ({ page }) => {
    const wasmRequests: string[] = [];
    page.on("request", (r) => {
      if (r.url().endsWith(".wasm")) wasmRequests.push(r.url());
    });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    expect(wasmRequests).toEqual([]);

    await page.goto("/learn/the-wash-sale");
    await page.getByRole("slider", { name: "Buy-back date" }).scrollIntoViewIfNeeded();
    await expect(page.locator("html")).toHaveAttribute("data-engine", "wasm");
    await page.getByRole("slider", { name: "Buy-back date" }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.locator("figure [aria-live]")).toContainText("$1,840");
  });
});

test.describe("explainer keyboard control", () => {
  test("wash sale: arrow = 1 day, Shift+arrow = 1 week, Home/End", async ({ page }) => {
    await page.goto("/learn/the-wash-sale");
    const marker = page.getByRole("slider", { name: "Buy-back date" });
    const live = page.locator("figure [aria-live]");
    await marker.scrollIntoViewIfNeeded();
    await expect(marker).toHaveAttribute("aria-valuetext", "Oct 22, inside the wash-sale window");

    await marker.focus();
    await page.keyboard.press("ArrowRight");
    await expect(marker).toHaveAttribute("aria-valuetext", "Oct 23, inside the wash-sale window");
    for (let i = 0; i < 3; i++) await page.keyboard.press("Shift+ArrowRight");
    await expect(marker).toHaveAttribute("aria-valuetext", "Nov 13, inside the wash-sale window");
    await page.keyboard.press("Shift+ArrowRight");
    await expect(marker).toHaveAttribute("aria-valuetext", "Nov 20, outside the wash-sale window");
    await expect(live).toContainText("outside the wash-sale window. The $1,840 loss is deductible this year.");

    await page.keyboard.press("Shift+ArrowLeft");
    await expect(marker).toHaveAttribute("aria-valuetext", "Nov 13, inside the wash-sale window");
    await expect(live).toContainText("now $14,820");

    await page.keyboard.press("Home");
    await expect(marker).toHaveAttribute("aria-valuetext", "Aug 31, outside the wash-sale window");
    await page.keyboard.press("End");
    await expect(marker).toHaveAttribute("aria-valuetext", "Nov 29, outside the wash-sale window");
  });

  test("IRA trap: the account switch moves the loss between the new lot and gone for good", async ({ page }) => {
    await page.goto("/learn/the-ira-trap");
    const live = page.locator("figure [aria-live]");
    await expect(live).toContainText("disallowed for good");
    await page.getByRole("radio", { name: "Roth IRA" }).focus();
    await page.keyboard.press("ArrowLeft");
    await expect(page.getByRole("radio", { name: "Brokerage One" })).toHaveAttribute("aria-checked", "true");
    await expect(live).toContainText("added to the new basis, now $2,810");
  });

  test("tax-loss harvesting: Enter harvests, arrows move between lots", async ({ page }) => {
    await page.goto("/learn/tax-loss-harvesting");
    const lots = page.locator("figure ul button");
    await lots.first().focus();
    await page.keyboard.press("ArrowRight");
    await expect(lots.nth(1)).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(lots.nth(1)).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("figure [aria-live]")).toContainText("Harvested 1 of 6");
    await page.getByRole("button", { name: "Harvest every safe loss" }).click();
    await expect(page.locator("figure [aria-live]")).toContainText("Harvested 6 of 6 losing lots: $2,826.60 of losses, saving about $678.38");
  });

  test("short vs long term: crossing the one-year line drops the tax", async ({ page }) => {
    await page.goto("/learn/short-vs-long-term");
    const marker = page.getByRole("slider", { name: "Sale date" });
    await marker.focus();
    await page.keyboard.press("Shift+ArrowRight");
    await expect(marker).toHaveAttribute("aria-valuetext", "Oct 22, held 364 days, short-term");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await expect(marker).toHaveAttribute("aria-valuetext", "Oct 24, held 366 days, long-term");
    await expect(page.locator("figure [aria-live]")).toContainText("about $683");
  });
});

test.describe("navigation", () => {
  test("nav anchors land below the fixed nav", async ({ page }) => {
    test.skip(isPhone(page), "the phone menu is covered by its own test");
    await page.goto("/");
    await settle(page);
    await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Agents", exact: true }).click();
    await expect.poll(async () => page.evaluate(() => Math.round(document.querySelector("#agents h2")!.getBoundingClientRect().top)), { timeout: 5_000 }).toBe(160);
  });

  test("phone menu opens, navigates and closes", async ({ page }) => {
    test.skip(!isPhone(page), "phones only");
    await page.goto("/");
    await settle(page);
    await page.getByRole("button", { name: "Menu" }).click();
    await page.locator("header [id] a", { hasText: "Learn" }).first().click();
    await expect(page.getByRole("button", { name: "Menu" })).toBeVisible();
    await expect.poll(async () => page.evaluate(() => Math.round(document.querySelector("#learn h2")!.getBoundingClientRect().top)), { timeout: 5_000 }).toBe(160);
  });

  test("unknown pages get the ledger 404", async ({ page }) => {
    const res = await page.goto("/not-a-real-page");
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("This page isn’t in the ledger.");
  });
});

test.describe("accessibility (axe)", () => {
  const pages = ["/", "/learn", ...EXPLAINER_SLUGS.map((s) => `/learn/${s}`), "/not-a-real-page"];
  for (const path of pages) {
    test(`no serious or critical violations on ${path}`, async ({ page }) => {
      // Final states, not mid-animation frames (an element fading in is "low contrast" for a moment).
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(path);
      await page.waitForTimeout(500);
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(serious.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(", ")})`)).toEqual([]);
    });
  }
});
