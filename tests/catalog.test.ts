import { describe, expect, it } from "vitest";
import { courses, resources, filterCourses } from "../lib/catalog";

describe("curriculum integrity", () => {
  it("keeps NU requirements distinct from optional app refreshers", () => {
    const required = courses.filter(course => course.group !== "refresher");
    expect(required).toHaveLength(32);
    expect(required.filter(course => course.group === "prerequisite")).toHaveLength(8);
    expect(required.filter(course => course.kind === "lab")).toHaveLength(6);
    expect(required.filter(course => course.kind === "capstone")).toHaveLength(3);
    expect(required.filter(course => course.group === "prerequisite").reduce((n,course)=>n+(course.credits ?? 0),0)).toBe(22);
    expect(required.filter(course => course.group === "major").reduce((n,course)=>n+(course.credits ?? 0),0)).toBe(60);
    expect(courses.filter(course => course.group === "refresher")).toHaveLength(12);
    expect(courses.every(course => course.status === "planned" && course.modules.length === 0)).toBe(true);
  });
  it("resolves every preparation and resource reference", () => {
    expect(new Set(courses.map(course => course.id)).size).toBe(courses.length);
    expect(new Set(resources.map(resource => resource.id)).size).toBe(resources.length);
    for (const course of courses) {
      expect(course.preparation.every(id => id !== course.id && courses.some(item => item.id === id))).toBe(true);
      expect(course.resourceIds.every(id => resources.some(item => item.id === id))).toBe(true);
    }
    for (const resource of resources) expect(resource.courseIds.every(id => courses.some(course => course.id === id))).toBe(true);
  });
  it("finds codes and titles while respecting combined filters", () => {
    expect(filterCourses("cee 310").map(course => course.id)).toEqual(["cee-310", "cee-310l"]);
    expect(filterCourses("calculus", "prerequisite").map(course => course.id)).toEqual(["csc-208", "csc-209"]);
    expect(filterCourses("missing topic")).toEqual([]);
    expect(filterCourses("", "refresher")).toHaveLength(12);
  });
});
