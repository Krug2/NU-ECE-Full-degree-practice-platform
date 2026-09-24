import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const viewport of [{ width: 1440, height: 960 }, { width: 390, height: 844 }]) {
  test(`release availability follows the selected learning path at ${viewport.width}px`, async ({ page }, info) => {
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto("/curriculum");
    const search = page.getByRole("searchbox", { name: "Search courses" });
    for (const [code, status] of [["PHS 231", "Available preview"], ["MTH 215", "Lessons in development"], ["PHS 232", "Lessons in development"], ["CSC 310", "Planning ahead"]]) {
      await search.fill(code);
      await expect(page.locator(".course-card")).toHaveCount(1);
      await expect(page.locator(".course-card .status-dot")).toHaveText(status);
    }
    await search.fill("PHS 231");
    await page.getByRole("link", { name: "Calculus-based Physics 1", exact: true }).click();
    await expect(page.locator(".meta-list")).toContainText("Technical preview");
    await expect(page.locator(".course-lessons:not(#assessments) > .notice")).toContainText("Independent subject review and learner pilot validation have not occurred.");
    await page.getByRole("button", { name: "Add to my plan", exact: true }).click();
    await expect(page.getByRole("button", { name: "Added to my plan", exact: true })).toBeVisible();
    await page.goto("/");
    await expect(page.locator(".next-course .pill")).toHaveText("Available preview");
    await expect(page.locator(".coverage-note .pill")).toHaveText("13 learning packs released");
    await page.getByRole("link", { name: "Open learning path", exact: true }).click();
    await expect(page).toHaveURL(/\/courses\/phs-231$/);
    const audit = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(audit.violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath(`released-course-${viewport.width}.png`), fullPage: true });
    await page.getByRole("link", { name: "Open lesson: Units, dimensions, and measurement evidence", exact: true }).click();
    await expect(page.locator(".lesson-kicker")).toContainText("Technical preview");
    await expect(page.locator("#read")).toContainText("This course is under construction");
    await page.goto("/courses/phs-231/assessments/quiz-m01");
    await expect(page.locator(".notice").first()).toContainText("not an official NU grading policy");
    await expect(page.getByRole("button", { name: "Start assessment", exact: true })).toBeEnabled();
    expect(errors).toEqual([]);
  });
}
