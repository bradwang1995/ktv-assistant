import { describe, expect, it } from "vitest";
import { searchCacheKey } from "./kvCache";

describe("KV search cache", () => {
  it("builds stable cache keys", () => {
    expect(searchCacheKey("后来 ktv")).toBe("yt-search:v1:后来 ktv:CA:zh-Hans");
  });
});

