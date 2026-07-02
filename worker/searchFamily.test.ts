import { describe, expect, it } from "vitest";
import { buildSearchQueryFamily, normalizeSearchFamilyQuery } from "./searchFamily";

describe("search query families", () => {
  it("normalizes karaoke variants into the same family", () => {
    expect(normalizeSearchFamilyQuery("Later ktv")).toBe("later");
    expect(normalizeSearchFamilyQuery("Later karaoke")).toBe("later");
    expect(buildSearchQueryFamily("Later ktv").hash).toBe(buildSearchQueryFamily("Later").hash);
  });

  it("builds broad source queries for YouTube search", () => {
    const family = buildSearchQueryFamily("Later", "Artist");

    expect(family.canonicalQuery).toBe("later");
    expect(family.normalizedQuery).toBe("later ktv");
    expect(family.aliases).toContain("later ktv");
    expect(family.aliases).toContain("later karaoke");
    expect(family.sourceQueries[0]).toContain("later ktv|later karaoke");
    expect(family.sourceQueries[0]).toContain("artist later ktv");
  });

  it("separates original-vocal searches from karaoke searches", () => {
    const karaoke = buildSearchQueryFamily("Later");
    const original = buildSearchQueryFamily("Later", undefined, {
      includeOriginalVocal: true,
    });

    expect(original.hash).not.toBe(karaoke.hash);
    expect(original.normalizedQuery).toBe("later lyric video");
    expect(original.sourceQueries[0]).toContain("later lyric video");
  });

  it("builds artist-mode source queries", () => {
    const family = buildSearchQueryFamily("Jay Chou", undefined, {
      searchType: "artist",
    });

    expect(family.searchType).toBe("artist");
    expect(family.normalizedQuery).toBe("jay chou ktv");
    expect(family.sourceQueries[0]).toContain("jay chou ktv");
    expect(family.sourceQueries[0]).toContain("jay chou karaoke");
  });
});
