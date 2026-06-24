import { describe, expect, it } from "vitest";
import { normalizeQuery, normalizeSearchQuery } from "./queryNormalize";

describe("query normalization", () => {
  it("trims and collapses whitespace", () => {
    expect(normalizeQuery("  后来   刘若英  ")).toBe("后来 刘若英");
  });

  it("adds ktv to search queries once", () => {
    expect(normalizeSearchQuery("后来")).toBe("后来 ktv");
    expect(normalizeSearchQuery("后来 ktv")).toBe("后来 ktv");
  });
});

