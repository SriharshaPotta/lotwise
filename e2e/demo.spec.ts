import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function openDemo(page: Page, hash = "") {
  await page.goto(`/demo${hash}`);
  await expect(page.locator("html")).toHaveAttribute("data-engine", "wasm", { timeout: 15_000 });
}

test.describe("demo app", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      if (!sessionStorage.getItem("keep")) localStorage.clear();
    });
  });

  test("opens on the sale you're about to regret, computed by the WASM engine", async ({ page }) => {
    await openDemo(page);
    const panel = page.getByRole("tabpanel");
    await expect(panel.getByText("WASH SALE", { exact: true })).toBeVisible({ timeout: 10_000 });
    await expect(panel.getByText("$1,840.00").first()).toBeVisible();
    await expect(panel.getByText("2 NVDA calls bought Oct 3 · Brokerage Two")).toBeVisible();
    await expect(panel.getByText("Sell on or after Nov 3")).toBeVisible();
    await expect(panel.getByText(/Harvest AMD instead/)).toBeVisible();
    await expect(panel.locator("[aria-live]").last()).toContainText("Wash sale: $1,840.00 disallowed");
  });

  test("rebuying in the Roth stamps PERMANENT", async ({ page }) => {
    await openDemo(page);
    const panel = page.getByRole("tabpanel");
    await panel.getByRole("radio", { name: "Brokerage Two" }).click();
    await panel.getByLabel("Position").selectOption("XYZ");
    await panel.getByRole("switch", { name: "Buy back" }).click();
    await panel.getByLabel("In account").selectOption("roth-ira");
    await expect(panel.getByText("PERMANENT", { exact: true })).toBeVisible({ timeout: 10_000 });
    await expect(panel.getByText(/gone for good/).first()).toBeVisible();
  });

  test("tabs work from the keyboard and harvest → simulate carries the lot", async ({ page }) => {
    await openDemo(page);
    await page.getByRole("tab", { name: "Simulate a sale" }).focus();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("tab", { name: "Harvest" })).toHaveAttribute("aria-selected", "true");
    await expect(page).toHaveURL(/#harvest$/);
    const panel = page.getByRole("tabpanel");
    await expect(panel.getByText("safe from Nov 3")).toBeVisible();
    await panel.getByRole("button", { name: "Simulate selling AMD in Brokerage Two" }).first().click();
    await expect(page.getByRole("tab", { name: "Simulate a sale" })).toHaveAttribute("aria-selected", "true");
    await expect(panel.locator("[aria-live]").last()).toContainText("Selling 80 AMD: realized −$1,120.00", { timeout: 10_000 });
  });

  test("import a CSV, keep it after a reload, then reset to the demo", async ({ page }) => {
    await openDemo(page, "#data");
    const panel = page.getByRole("tabpanel");
    await panel.getByRole("radio", { name: "Replace everything" }).click();
    await panel.getByLabel("CSV or JSON").fill("date,account,side,symbol,qty,price\n2026-01-05,Taxable,buy,ABC,10,100\n2026-02-05,Taxable,sell,ABC,10,80\n2026-02-20,My Roth IRA,buy,ABC,10,81\n");
    await panel.getByRole("button", { name: "Check" }).click();
    await expect(panel.getByText(/Lotwise CSV: 3 trades in Taxable \(taxable\), My Roth IRA \(roth\)/)).toBeVisible();
    await panel.getByRole("button", { name: /^Import 3 trades/ }).click();
    await expect(panel.getByText("Imported 3 trades.")).toBeVisible();

    await page.evaluate(() => sessionStorage.setItem("keep", "1"));
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-engine", "wasm", { timeout: 15_000 });
    await page.getByRole("tab", { name: "This year" }).click();
    await expect(page.getByRole("tabpanel").getByText("$200.00").first()).toBeVisible();
    await expect(page.getByText(/your data/).first()).toBeVisible();

    await page.getByRole("tab", { name: "Your data" }).click();
    await page.getByRole("button", { name: "Reset to the demo" }).click();
    await expect(page.getByText("30 trades · 3 accounts")).toBeVisible();
  });

  test("no serious axe violations on any tab", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const tab of ["simulate", "positions", "harvest", "long-term", "year", "data"]) {
      await openDemo(page, `#${tab}`);
      await page.waitForTimeout(400);
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(serious.map((v) => `${tab} ${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(", ")})`)).toEqual([]);
    }
  });
});
