import { describe, expect, it } from "vitest";
import { backupByteLimit,backupLimitLabel,emptyProgress, parseBackup, moveCourse, weekSummary, progressSchema } from "../lib/progress";

describe("progress portability", () => {
  it("preserves notes, course order, and saved resources in a round trip", () => {
    const progress = { ...emptyProgress(), plan: ["csc-208", "f02"], bookmarks: ["R03"], notes: { "csc-208": "Review integration by parts." } };
    expect(parseBackup(JSON.stringify(progress))).toEqual(progress);
  });
  it.each([
    { schemaVersion: 999 }, { plan: ["missing-course"] }, { plan: ["f01", "f01"] },
    { bookmarks: ["unknown"] }, { notes: { "unknown": "private note" } },
    { notes: { "f01": "x".repeat(5001) } }, { sessions: [{ id: "fake", courseId: "f01", minutes: -2, at: "tomorrow" }] },
    { profile: { displayName: "A", weeklyHours: 10000 } }, { extra: "unexpected" },
  ])("rejects invalid imports without silently discarding data: %j", invalid => {
    expect(() => parseBackup(JSON.stringify({ ...emptyProgress(), ...invalid }))).toThrow();
  });
  it("rejects malformed and oversized files", () => {
    expect(() => parseBackup("not JSON")).toThrow("valid JSON");
    expect(() => parseBackup(" ".repeat(backupByteLimit+1))).toThrow(backupLimitLabel);
  });
  it("keeps every accepted progress record small enough to export and restore", () => {
    const notes=Object.fromEntries(Array.from({length:9970},(_,index)=>["n"+index,"x".repeat(5000)]));
    const tooLarge=emptyProgress();tooLarge.learning.notes={"mth-215":notes};
    expect(new TextEncoder().encode(JSON.stringify(tooLarge)).length).toBeLessThan(backupByteLimit);
    expect(new TextEncoder().encode(JSON.stringify(tooLarge,null,2)).length).toBeGreaterThan(backupByteLimit);
    expect(progressSchema.safeParse(tooLarge).success).toBe(false);
    const accepted = progressSchema.parse({...tooLarge,learning:{...tooLarge.learning,notes:{"mth-215":Object.fromEntries(Object.entries(notes).slice(0,200))}}});
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
