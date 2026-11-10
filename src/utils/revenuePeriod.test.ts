import { describe, expect, it } from "vitest";
import {
  currentBusinessDate,
  fixedRevenueRange,
  customBusinessRange,
} from "./revenuePeriod";
describe("Jozo revenue periods — Vietnam exact [start, end)", () => {
  it("applies configured cutoffs to historical periods", () => {
    const config = { monthStartDay: 10, businessStart: "08:30", businessEnd: "02:15" };
    expect(fixedRevenueRange("monthly", "2026-11-09", config)).toEqual({
      start: "2026-10-10T01:30:00.000Z", end: "2026-11-09T19:15:00.000Z",
    });
    expect(currentBusinessDate(new Date("2026-11-06T08:00:00+07:00"), config)).toBe("2026-11-05");
    expect(customBusinessRange("2026-11-06", "2026-11-06", config)).toEqual({
      start: "2026-11-06T01:30:00.000Z", end: "2026-11-06T19:15:00.000Z",
    });
  });
  it("anchors early morning and pre-opening to previous business day", () => {
    expect(currentBusinessDate(new Date("2026-11-06T02:00:00+07:00"))).toBe(
      "2026-11-05",
    );
    expect(currentBusinessDate(new Date("2026-11-06T09:00:00+07:00"))).toBe(
      "2026-11-06",
    );
  });
  it.each([
    [
      "daily",
      "2026-11-06",
      "2026-11-06T02:00:00.000Z",
      "2026-11-06T20:00:00.000Z",
    ],
    [
      "weekly",
      "2026-11-08",
      "2026-11-02T02:00:00.000Z",
      "2026-11-08T20:00:00.000Z",
    ],
    [
      "monthly",
      "2026-11-05",
      "2026-10-06T02:00:00.000Z",
      "2026-11-05T20:00:00.000Z",
    ],
    [
      "monthly",
      "2026-11-06",
      "2026-11-06T02:00:00.000Z",
      "2026-12-05T20:00:00.000Z",
    ],
    [
      "quarterly",
      "2026-01-05",
      "2025-10-06T02:00:00.000Z",
      "2026-01-05T20:00:00.000Z",
    ],
    [
      "quarterly",
      "2026-03-31",
      "2026-01-06T02:00:00.000Z",
      "2026-04-05T20:00:00.000Z",
    ],
    [
      "monthly",
      "2024-02-29",
      "2024-02-06T02:00:00.000Z",
      "2024-03-05T20:00:00.000Z",
    ],
  ] as const)("%s containing %s", (period, date, start, end) => {
    expect(fixedRevenueRange(period, date)).toEqual({ start, end });
  });
  it("defaults custom business dates to 09:00 and next day 03:00", () => {
    expect(customBusinessRange("2026-11-06", "2026-11-08")).toEqual({
      start: "2026-11-06T02:00:00.000Z",
      end: "2026-11-08T20:00:00.000Z",
    });
  });
});
