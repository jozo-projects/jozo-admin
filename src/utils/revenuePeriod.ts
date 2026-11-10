import dayjs from "@/lib/dayjs";

export type RevenuePeriod =
  | "daily"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "custom";
export type RevenueRange = { start: string; end: string };
export const VN_TZ = "Asia/Ho_Chi_Minh";
export type RevenueSettings = { monthStartDay: number; businessStart: string; businessEnd: string };
export const DEFAULT_REVENUE_SETTINGS: RevenueSettings = { monthStartDay: 6, businessStart: "09:00", businessEnd: "03:00" };

export const revenueRangeLabel = (range: RevenueRange) =>
  `${dayjs(range.start).tz(VN_TZ).format("HH:mm DD/MM/YYYY")} → ${dayjs(range.end).tz(VN_TZ).format("HH:mm DD/MM/YYYY")}`;

// Before opening, “current” still belongs to the preceding business date.
export function currentBusinessDate(now = new Date(), settings = DEFAULT_REVENUE_SETTINGS): string {
  const [hour, minute] = settings.businessStart.split(":").map(Number);
  return dayjs(now).tz(VN_TZ).subtract(hour * 60 + minute, "minute").format("YYYY-MM-DD");
}

export function fixedRevenueRange(
  period: Exclude<RevenuePeriod, "custom">,
  date: string,
  settings = DEFAULT_REVENUE_SETTINGS,
): RevenueRange {
  let first = dayjs.tz(date, VN_TZ).startOf("day");
  let next = first.add(1, "day");
  if (period === "weekly") {
    first = first.subtract((first.day() + 6) % 7, "day");
    next = first.add(7, "day");
  } else if (period === "monthly" || period === "quarterly") {
    if (first.date() < settings.monthStartDay) first = first.subtract(1, "month");
    first = first.date(settings.monthStartDay);
    if (period === "quarterly")
      first = first.month(Math.floor(first.month() / 3) * 3);
    next = first.add(period === "quarterly" ? 3 : 1, "month");
  }
  return {
    start: first.hour(Number(settings.businessStart.slice(0, 2))).minute(Number(settings.businessStart.slice(3))).toISOString(),
    end: next.hour(Number(settings.businessEnd.slice(0, 2))).minute(Number(settings.businessEnd.slice(3))).toISOString(),
  };
}

export function customBusinessRange(from: string, to: string, settings = DEFAULT_REVENUE_SETTINGS): RevenueRange {
  return {
    start: dayjs.tz(`${from}T${settings.businessStart}`, VN_TZ).toISOString(),
    end: dayjs.tz(`${to}T${settings.businessEnd}`, VN_TZ).add(1, "day").toISOString(),
  };
}
