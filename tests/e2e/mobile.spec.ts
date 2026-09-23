import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("mobile navigation, course filters, and layouts remain usable", async ({ page }, testInfo) => {
  const failures: unknown[] = [];
  await page.goto("/");
  await page.getByRole("button", { name: "Open navigation", exact: true }).click();
  await page.getByRole("link", { name: "Curriculum", exact: true }).click();
  await expect(page.getByRole("button", { name: "Open navigation", exact: true })).toHaveAttribute("aria-expanded", "false");
  await page.getByRole("button", { name: "Refreshers", exact: true }).click();
  await expect(page.getByRole("article")).toHaveCount(12);
  await page.getByRole("searchbox", { name: "Search courses" }).fill("calculus");
  await expect(page.getByRole("article")).toHaveCount(1);
  await page.getByRole("link", { name: "Calculus recall", exact: true }).click();
  await page.getByRole("button", { name: "Add to my plan", exact: true }).click();
  await page.goto("/courses/cee-324l");
  await page.getByRole("button", { name: "Add to my plan", exact: true }).click();
  await page.goto("/plan");
  await expect(page.locator(".plan-list > li")).toHaveCount(2);
  await page.getByLabel("Minutes studied", { exact: true }).fill("15");
  await page.getByRole("button", { name: "Save session", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Recorded 15 minutes");
  for (const route of ["/", "/curriculum", "/courses/f08", "/plan", "/resources", "/settings"]) {
    await page.goto(route);
    await page.screenshot({ path: testInfo.outputPath(`${route.replaceAll("/", "-") || "overview"}.png`) });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), route).toBe(true);
    const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    if (result.violations.length) failures.push({ route, violations: result.violations.map(item => ({ id: item.id, nodes: item.nodes.map(node => node.target) })) });
  }
  expect(failures).toEqual([]);
});
