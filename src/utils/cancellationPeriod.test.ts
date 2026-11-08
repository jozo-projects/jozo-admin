import { describe, expect, it } from "vitest";
import { cancellationRange } from "./cancellationPeriod";

describe("kỳ thống kê huỷ theo giờ Việt Nam", () => {
  it.each([
    ["daily", "2026-11-06", "2026-11-05T20:00:00.000Z", "2026-11-06T20:00:00.000Z"],
    ["weekly", "2026-11-08", "2026-11-01T20:00:00.000Z", "2026-11-08T20:00:00.000Z"],
    ["monthly", "2026-11-05", "2026-10-31T20:00:00.000Z", "2026-11-30T20:00:00.000Z"],
    ["quarterly", "2026-02-01", "2025-12-31T20:00:00.000Z", "2026-03-31T20:00:00.000Z"],
  ] as const)("%s %s", (period, date, start, end) => {
    expect(cancellationRange(period, date)).toEqual({ start, end });
  });
});
