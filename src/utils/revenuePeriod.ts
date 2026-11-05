import dayjs from "@/lib/dayjs";

export type RevenuePeriod =
  | "daily"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "custom";
export type RevenueRange = { start: string; end: string };
export const VN_TZ = "Asia/Ho_Chi_Minh";

export const revenueRangeLabel = (range: RevenueRange) =>
  `${dayjs(range.start).tz(VN_TZ).format("HH:mm DD/MM/YYYY")} → ${dayjs(range.end).tz(VN_TZ).format("HH:mm DD/MM/YYYY")}`;

// Before opening, “current” still belongs to the preceding business date.
export function currentBusinessDate(now = new Date()): string {
  return dayjs(now).tz(VN_TZ).subtract(9, "hour").format("YYYY-MM-DD");
}

export function fixedRevenueRange(
  period: Exclude<RevenuePeriod, "custom">,
  date: string,
): RevenueRange {
  let first = dayjs.tz(date, VN_TZ).startOf("day");
  let next = first.add(1, "day");
  if (period === "weekly") {
    first = first.subtract((first.day() + 6) % 7, "day");
    next = first.add(7, "day");
  } else if (period === "monthly" || period === "quarterly") {
    if (first.date() < 6) first = first.subtract(1, "month");
    first = first.date(6);
    if (period === "quarterly")
      first = first.month(Math.floor(first.month() / 3) * 3);
    next = first.add(period === "quarterly" ? 3 : 1, "month");
  }
  return {
    start: first.hour(9).toISOString(),
    end: next.hour(3).toISOString(),
  };
}

export function customBusinessRange(from: string, to: string): RevenueRange {
  return {
    start: dayjs.tz(`${from}T09:00`, VN_TZ).toISOString(),
    end: dayjs.tz(`${to}T03:00`, VN_TZ).add(1, "day").toISOString(),
  };
}
