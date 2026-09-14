import { describe, expect, it } from "vitest";
import { computeStreakDays } from "./streak";

function daysAgo(n: number): Date {
  const d = new Date();
  d.setUTCHours(12, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

describe("computeStreakDays", () => {
  it("returns 0 for no activity", () => {
    expect(computeStreakDays([])).toBe(0);
  });

  it("returns 1 for activity only today", () => {
    expect(computeStreakDays([daysAgo(0)])).toBe(1);
  });

  it("counts consecutive days ending today", () => {
    expect(computeStreakDays([daysAgo(0), daysAgo(1), daysAgo(2)])).toBe(3);
  });

  it("still counts the streak if today has no activity yet but yesterday does", () => {
    expect(computeStreakDays([daysAgo(1), daysAgo(2), daysAgo(3)])).toBe(3);
  });

  it("breaks the streak on a gap", () => {
    expect(computeStreakDays([daysAgo(0), daysAgo(1), daysAgo(3)])).toBe(2);
  });

  it("returns 0 when the most recent activity is more than a day old", () => {
    expect(computeStreakDays([daysAgo(5), daysAgo(6)])).toBe(0);
  });

  it("dedupes multiple activities on the same day", () => {
    expect(computeStreakDays([daysAgo(0), daysAgo(0), daysAgo(0)])).toBe(1);
  });
});
