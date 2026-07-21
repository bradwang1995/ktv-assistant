import { describe, expect, it } from "vitest";
import {
  isValidDeleteIds,
  normalizeAdminRange,
  previewAdminRepositoryCleanup,
  readConfiguredCleanupBatchSize,
  readConfiguredCleanupTargetPercentage,
  readConfiguredCapacityBytes,
  readConfiguredWarningThresholdPercentage,
} from "./searchRepository";

describe("admin repository input normalization", () => {
  it("normalizes supported overview ranges", () => {
    expect(normalizeAdminRange("24h")).toBe("24h");
    expect(normalizeAdminRange("7d")).toBe("7d");
    expect(normalizeAdminRange("30d")).toBe("30d");
    expect(normalizeAdminRange("year")).toBe("24h");
  });

  it("only accepts bounded repository id batches", () => {
    expect(isValidDeleteIds(["8f620968-894f-48a9-bced-a56202805ed7"])).toBe(true);
    expect(isValidDeleteIds([])).toBe(false);
    expect(isValidDeleteIds(["unsafe/id"])).toBe(false);
    expect(isValidDeleteIds(Array.from({ length: 51 }, (_, index) => `entry-${index}`))).toBe(false);
  });

  it("does not invent a storage capacity when none is configured", () => {
    expect(readConfiguredCapacityBytes(undefined)).toBeNull();
    expect(readConfiguredCapacityBytes("unknown")).toBeNull();
    expect(readConfiguredCapacityBytes("524288000")).toBe(524288000);
    expect(readConfiguredWarningThresholdPercentage(undefined)).toBeNull();
    expect(readConfiguredWarningThresholdPercentage("0")).toBeNull();
    expect(readConfiguredWarningThresholdPercentage("100")).toBeNull();
    expect(readConfiguredWarningThresholdPercentage("80")).toBe(80);
    expect(readConfiguredCleanupTargetPercentage("70")).toBe(70);
    expect(readConfiguredCleanupBatchSize(undefined)).toBe(25);
    expect(readConfiguredCleanupBatchSize("500")).toBe(50);
  });
});

describe("repository cleanup preview", () => {
  it("refuses to invent capacity or cleanup candidates when capacity is unknown", async () => {
    const db = cleanupPreviewDb({ databaseBytes: 900, estimatedRepositoryBytes: 400 });
    const preview = await previewAdminRepositoryCleanup(db, {
      capacityBytes: null,
      thresholdPercentage: 80,
      targetPercentage: 70,
      batchSize: 25,
    });

    expect(preview).toMatchObject({
      configured: false,
      actionNeeded: false,
      unavailableReason: "capacity_unknown",
      capacityPercentage: null,
      candidates: [],
    });
  });

  it("does not select candidates below the configured threshold", async () => {
    const db = cleanupPreviewDb({ databaseBytes: 700, estimatedRepositoryBytes: 400 });
    const preview = await previewAdminRepositoryCleanup(db, {
      capacityBytes: 1_000,
      thresholdPercentage: 80,
      targetPercentage: 70,
      batchSize: 25,
    });

    expect(preview).toMatchObject({
      configured: true,
      actionNeeded: false,
      unavailableReason: "below_threshold",
      capacityPercentage: 70,
    });
  });

  it("selects a bounded low-reuse batch until the estimated target is covered", async () => {
    const db = cleanupPreviewDb({
      databaseBytes: 900,
      estimatedRepositoryBytes: 500,
      candidates: [
        cleanupCandidate("old-unused", 0, 120),
        cleanupCandidate("old-rare", 1, 100),
        cleanupCandidate("popular", 40, 280),
      ],
    });
    const preview = await previewAdminRepositoryCleanup(db, {
      capacityBytes: 1_000,
      thresholdPercentage: 80,
      targetPercentage: 70,
      batchSize: 3,
    });

    expect(preview.actionNeeded).toBe(true);
    expect(preview.candidates.map((candidate) => candidate.id)).toEqual([
      "old-unused",
      "old-rare",
    ]);
    expect(preview.estimatedBytesToRemove).toBe(220);
    expect(preview.policy).toContain("复用次数、最近使用、创建时间");
  });
});

function cleanupPreviewDb({
  databaseBytes,
  estimatedRepositoryBytes,
  candidates = [],
}: {
  databaseBytes: number;
  estimatedRepositoryBytes: number;
  candidates?: Record<string, unknown>[];
}) {
  return {
    prepare(sql: string) {
      const statement = {
        bind() {
          return statement;
        },
        async all() {
          if (sql.includes("estimated_repository_bytes")) {
            return {
              results: [
                {
                  total_queries: candidates.length || 1,
                  estimated_repository_bytes: estimatedRepositoryBytes,
                },
              ],
              success: true,
              meta: { size_after: databaseBytes },
            };
          }

          if (sql.includes("FROM admin_audit_events")) {
            return { results: [], success: true, meta: {} };
          }

          expect(sql).toContain(
            "ORDER BY access_count ASC, last_accessed_at ASC, created_at ASC, id ASC",
          );
          return { results: candidates, success: true, meta: {} };
        },
      };
      return statement;
    },
  } as unknown as D1Database;
}

function cleanupCandidate(id: string, accessCount: number, approxBytes: number) {
  return {
    id,
    original_query: id,
    search_type: "song",
    access_count: accessCount,
    approx_bytes: approxBytes,
    created_at: "2026-01-01T00:00:00.000Z",
    last_accessed_at: "2026-01-02T00:00:00.000Z",
  };
}
