import { describe, expect, it } from "vitest";
import { emptyProgress, parseBackup, moveCourse, weekSummary, progressSchema } from "../lib/progress";

describe("progress portability", () => {
  it("preserves notes, course order, and saved resources in a round trip", () => {
    const progress = { ...emptyProgress(), plan: ["csc-208", "f02"], bookmarks: ["R03"], notes: { "csc-208": "Review integration by parts." } };
    expect(parseBackup(JSON.stringify(progress))).toEqual(progress);
  });
  it.each([
    { schemaVersion: 2 }, { plan: ["missing-course"] }, { plan: ["f01", "f01"] },
    { bookmarks: ["unknown"] }, { notes: { "unknown": "private note" } },
    { notes: { "f01": "x".repeat(5001) } }, { sessions: [{ id: "fake", courseId: "f01", minutes: -2, at: "tomorrow" }] },
    { profile: { displayName: "A", weeklyHours: 10000 } }, { extra: "unexpected" },
  ])("rejects invalid imports without silently discarding data: %j", invalid => {
    expect(() => parseBackup(JSON.stringify({ ...emptyProgress(), ...invalid }))).toThrow();
  });
  it("rejects malformed and oversized files", () => {
    expect(() => parseBackup("not JSON")).toThrow("valid JSON");
    expect(() => parseBackup(" ".repeat(1_000_001))).toThrow("1 MB");
  });
  it("keeps every accepted progress record small enough to export and restore", () => {
    const sessions = Array.from({ length: 2250 }, () => ({ id: crypto.randomUUID(), courseId: "f01", minutes: 30, at: "2026-09-22T12:00:00.000Z", note: "x".repeat(300) }));
    const tooLarge = { ...emptyProgress(), sessions };
    expect(JSON.stringify(tooLarge).length).toBeLessThan(1_000_000);
    expect(JSON.stringify(tooLarge, null, 2).length).toBeGreaterThan(1_000_000);
    expect(progressSchema.safeParse(tooLarge).success).toBe(false);
    const accepted = progressSchema.parse({ ...tooLarge, sessions: sessions.slice(0,1000) });
    expect(parseBackup(JSON.stringify(accepted, null, 2))).toEqual(accepted);
  });
  it("moves courses without losing or duplicating an entry", () => {
    const plan = ["f01", "csc-208", "cee-310"];
    expect(moveCourse(plan, "csc-208", -1)).toEqual(["csc-208", "f01", "cee-310"]);
    expect(moveCourse(plan, "f01", -1)).toEqual(plan);
    expect(moveCourse(plan, "missing", 1)).toEqual(plan);
  });
  it("counts only real sessions in the current local week", () => {
    const now = new Date(2026, 8, 23, 12);
    const makeSession = (day: number, minutes: number) => ({ id: crypto.randomUUID(), courseId: "f01", minutes, at: new Date(2026,8,day,10).toISOString(), note: "" });
    const summary = weekSummary([makeSession(20,60), makeSession(21,30), makeSession(23,45), makeSession(24,120)], now);
    expect(summary.minutes).toBe(75);
    expect(summary.days.map(day => day.minutes)).toEqual([30,0,45,0,0,0,0]);
  });
});
