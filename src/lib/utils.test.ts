import { describe, expect, it } from "vitest";
import { formatDuration, formatPercent, slugify } from "./utils";

describe("formatPercent", () => {
  it("rounds to the nearest integer", () => {
    expect(formatPercent(66.666)).toBe(67);
    expect(formatPercent(33.333)).toBe(33);
  });

  it("clamps to [0, 100]", () => {
    expect(formatPercent(-10)).toBe(0);
    expect(formatPercent(150)).toBe(100);
  });

  it("treats the spec's worked example correctly (15/20 lessons)", () => {
    expect(formatPercent((15 / 20) * 100)).toBe(75);
  });

  it("returns 0 for non-finite input", () => {
    expect(formatPercent(NaN)).toBe(0);
    expect(formatPercent(Infinity)).toBe(0);
  });
});

describe("formatDuration", () => {
  it("formats seconds, minutes and hours", () => {
    expect(formatDuration(45)).toBe("45s");
    expect(formatDuration(90)).toBe("1m");
    expect(formatDuration(3660)).toBe("1h 1m");
  });

  it("returns 0m for zero or negative input", () => {
    expect(formatDuration(0)).toBe("0m");
    expect(formatDuration(-5)).toBe("0m");
  });
});

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("What is Java?")).toBe("what-is-java");
  });

  it("collapses repeated separators", () => {
    expect(slugify("  Multiple   Spaces -- here ")).toBe("multiple-spaces-here");
  });
});
