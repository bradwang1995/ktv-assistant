import { describe, expect, it } from "vitest";
import { formatRelativeQuotaReset } from "./quotaReset";

describe("formatRelativeQuotaReset", () => {
  it("shows a rounded-up relative hour count without timezone details", () => {
    const now = Date.parse("2026-07-14T10:15:00.000Z");

    expect(formatRelativeQuotaReset("2026-07-14T13:30:00.000Z", now)).toBe(
      "本地重置还有 4 小时",
    );
  });

  it("keeps the last partial hour simple", () => {
    const now = Date.parse("2026-07-14T10:15:00.000Z");

    expect(formatRelativeQuotaReset("2026-07-14T10:45:00.000Z", now)).toBe(
      "本地重置还有 1 小时",
    );
  });

  it("handles elapsed and invalid reset timestamps", () => {
    const now = Date.parse("2026-07-14T10:15:00.000Z");

    expect(formatRelativeQuotaReset("2026-07-14T10:00:00.000Z", now)).toBe(
      "本地重置即将开始",
    );
    expect(formatRelativeQuotaReset("not-a-date", now)).toBe("本地重置时间暂不可用");
  });
});
