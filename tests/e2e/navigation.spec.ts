import { expect, test } from "@playwright/test";

test("loading saved notes does not move the adjacent lesson controls", async ({ page }) => {
  let releaseScripts!: () => void;
  const scriptsReady = new Promise<void>(resolve => { releaseScripts = resolve; });
  const progress = { schemaVersion: 2, profile: { displayName: "", weeklyHours: 5 }, plan: [], bookmarks: [], notes: {}, confidence: {}, sessions: [], learning: { attempts: [], evidence: [], notes: { "mth-215": { "m01-l03": "Keep both roots and check the requested number system." } } } };
  await page.addInitScript(data => localStorage.setItem("ece-study:progress:v1", JSON.stringify(data)), progress);
  await page.route(/\/_next\/static\/chunks\/.*\.js(?:\?|$)/, async route => { await scriptsReady; await route.continue(); });
  try {
    await page.goto("/courses/mth-215/lessons/m01-l03", { waitUntil: "domcontentloaded" });
    const notes = page.getByLabel("Reasoning, questions, or a worked solution to revisit", { exact: true });
    await expect(notes).toBeVisible();
    await expect(notes).toBeDisabled();
    await page.evaluate(() => document.fonts.ready);
    const next = page.getByRole("link", { name: "Next: Restrictions and extraneous solutions", exact: true });
    const before = await next.evaluate(element => element.getBoundingClientRect().top + scrollY);
    releaseScripts();
    await expect(notes).toBeEnabled();
    await expect(notes).toHaveValue(progress.learning.notes["mth-215"]["m01-l03"]);
    const after = await next.evaluate(element => element.getBoundingClientRect().top + scrollY);
    expect(Math.abs(after - before)).toBeLessThan(1);
    await next.click();
    await expect(page).toHaveURL("/courses/mth-215/lessons/m01-l04");
    await expect(page.locator("#guided").getByLabel("Valid solutions", { exact: true })).toBeVisible();
  } finally { releaseScripts(); }
});
