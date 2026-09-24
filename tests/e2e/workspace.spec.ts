import { readStoredProgress } from "./progress";
import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";

const storageKey = "ece-study:progress:v1";

test("browse, organize, record study, and restore a complete backup", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  await page.getByRole("link", { name: "Explore the curriculum", exact: true }).click();
  await page.getByRole("searchbox", { name: "Search courses" }).fill("CEE 310");
  await expect(page.getByRole("article")).toHaveCount(2);
  await page.getByRole("link", { name: "Circuit Analysis", exact: true }).click();
  await expect(page.getByText("Awaiting course planning", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Add to my plan", exact: true }).click();
  await expect(page.getByRole("button", { name: "Added to my plan", exact: true })).toBeVisible();
  await page.getByLabel("Course notes", { exact: true }).fill("Review Kirchhoff's laws <script>literal text</script>");
  await page.getByRole("button", { name: "Save notes", exact: true }).click();
  await expect(page.getByText("Notes saved in this browser.", { exact: true })).toBeVisible();
  await page.getByLabel("How familiar does this feel?").selectOption("refresh");
  await expect.poll(async () => (await readStoredProgress(page)).confidence["cee-310"]).toBe("refresh");
  await page.reload();
  await expect(page.getByLabel("Course notes", { exact: true })).toHaveValue("Review Kirchhoff's laws <script>literal text</script>");
  await expect(page.getByLabel("How familiar does this feel?")).toHaveValue("refresh");
  await page.goto("/courses/f02");
  await page.getByRole("button", { name: "Add to my plan", exact: true }).click();
  await expect(page.getByRole("button", { name: "Added to my plan", exact: true })).toBeVisible();
  await page.goto("/plan");
  await page.getByRole("button", { name: "Move F02 up", exact: true }).click();
  await expect(page.locator(".plan-list > li").first()).toContainText("F02");
  await page.goto("/resources?course=csc-208");
  await page.getByRole("button", { name: "Save OpenStax Calculus Volume 1", exact: true }).click();
  await expect(page.getByRole("button", { name: "Unsave OpenStax Calculus Volume 1", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.goto("/settings");
  await page.getByLabel("What should we call you?", { exact: false }).fill("Sam");
  await page.getByLabel("Weekly study goal", { exact: true }).fill("8");
  await page.getByRole("button", { name: "Save preferences", exact: true }).click();
  await expect(page.getByText("Preferences saved.", { exact: true })).toBeVisible();
  await page.goto("/plan");
  await page.getByLabel("Course or refresher", { exact: true }).selectOption("cee-310");
  await page.getByLabel("Minutes studied", { exact: true }).fill("45");
  await page.getByRole("button", { name: "Save session", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Recorded 45 minutes");
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Welcome back, Sam.", exact: true })).toBeVisible();
  await expect(page.getByRole("img", { name: "9% of your weekly study goal recorded", exact: true })).toBeVisible();
  await page.goto("/settings");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export progress", exact: true }).click();
  const download = await downloadPromise;
  const file = testInfo.outputPath("progress.json");
  await download.saveAs(file);
  const exported = JSON.parse(await readFile(file, "utf8"));
  expect(exported.plan).toEqual(["f02", "cee-310"]);
  expect(exported.bookmarks).toEqual(["R03"]);
  expect(exported.sessions[0].minutes).toBe(45);
  await page.evaluate(() => localStorage.setItem("unrelated-data", "keep"));
  await page.getByRole("button", { name: "Reset local progress", exact: true }).click();
  await page.getByRole("button", { name: "Confirm reset", exact: true }).click();
  await expect(page.getByLabel("Weekly study goal", { exact: true })).toHaveValue("5");
  expect(await page.evaluate(() => localStorage.getItem("unrelated-data"))).toBe("keep");
  await page.getByLabel("Import a progress backup", { exact: true }).setInputFiles(file);
  await expect(page.getByText("Review this backup", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Weekly study goal", { exact: true })).toHaveValue("5");
  await page.getByRole("button", { name: "Replace with this backup", exact: true }).click();
  await expect(page.getByText(/^Backup restored\./)).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Weekly study goal", { exact: true })).toHaveValue("8");
  await page.goto("/plan");
  await expect(page.locator(".plan-list > li")).toHaveCount(2);
  await expect(page.getByText("CEE 310 · 45 minutes", { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test("invalid imports preserve existing progress and cancelled resets do nothing", async ({ page }) => {
  await page.goto("/courses/f01");
  await page.getByRole("button", { name: "Add to my plan", exact: true }).click();
  await expect(page.getByRole("button", { name: "Added to my plan", exact: true })).toBeVisible();
  await page.goto("/settings");
  const before = await readStoredProgress(page);
  await page.getByLabel("Import a progress backup", { exact: true }).setInputFiles({ name: "future.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify({ schemaVersion: 999 })) });
  await expect(page.getByText(/unsupported version or invalid progress/)).toBeVisible();
  await page.getByRole("button", { name: "Reset local progress", exact: true }).click();
  await page.getByRole("button", { name: "Keep my progress", exact: true }).click();
  expect(await readStoredProgress(page)).toEqual(before);
});

test("corrupt stored data is preserved until explicit recovery", async ({ page }) => {
  await page.addInitScript(key => localStorage.setItem(key, "{broken backup"), storageKey);
  await page.goto("/courses/f01");
  await expect(page.getByRole("alert").filter({ hasText: "could not be migrated" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add to my plan", exact: true })).toBeDisabled();
  expect(await page.evaluate(key => localStorage.getItem(key), storageKey)).toBe("{broken backup");
});

test("storage failures remain visible and changes can still be exported", async ({ page },testInfo) => {
  await page.goto("/courses/f01");
  await expect(page.getByRole("button",{name:"Add to my plan",exact:true})).toBeEnabled();
  await page.evaluate(()=>{const put=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(){IDBObjectStore.prototype.put=put;throw new DOMException("Full","QuotaExceededError");};});
  await page.getByRole("button", { name: "Add to my plan", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "could not save your changes" })).toBeVisible();
  expect((await readStoredProgress(page)).plan).toEqual([]);
  await page.getByRole("link", { name: "Open backup and recovery settings", exact: true }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export progress", exact: true }).click();
  const file=testInfo.outputPath("unsaved-progress.json");await(await downloadPromise).saveAs(file);
  expect(JSON.parse(await readFile(file,"utf8")).plan).toEqual(["f01"]);
  const accessibility=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();
  expect(accessibility.violations).toEqual([]);
  await page.screenshot({path:testInfo.outputPath("progress-recovery.png"),fullPage:true});
  await page.getByRole("button",{name:"Retry saving",exact:true}).click();
  await expect(page.getByText("Your unsaved change has now been saved.",{exact:true})).toBeVisible();
  expect((await readStoredProgress(page)).plan).toEqual(["f01"]);
});

test("saved changes are reflected in another open tab", async ({ page, context }) => {
  await page.goto("/courses/f01");
  const other = await context.newPage();
  await other.goto("/plan");
  await expect(other.getByText("Start with one course", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Add to my plan", exact: true }).click();
  await expect(other.locator(".plan-list > li")).toHaveCount(1);
  await other.close();
});

test("primary pages pass automated accessibility and handle missing routes", async ({ page }, testInfo) => {
  const failures: unknown[] = [];
  for (const route of ["/", "/curriculum", "/courses/csc-208", "/plan", "/resources", "/settings"]) {
    await page.goto(route);
    await page.screenshot({ path: testInfo.outputPath(`${route.replaceAll("/", "-") || "overview"}.png`) });
    const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    if (result.violations.length) failures.push({ route, violations: result.violations.map(item => ({ id: item.id, nodes: item.nodes.map(node => node.target) })) });
  }
  expect(failures).toEqual([]);
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content", exact: true })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
  const response = await page.goto("/courses/missing-course");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "This page isn't in the map", exact: true })).toBeVisible();
});
