import dayjs from "@/lib/dayjs";
import { VN_TZ, type RevenuePeriod, type RevenueRange } from "./revenuePeriod";

/** Kỳ vận hành liên tục từ 03:00 ngày đầu đến 03:00 ngày kế tiếp sau kỳ. */
export function cancellationRange(period: Exclude<RevenuePeriod, "custom">, date: string): RevenueRange {
  let first = dayjs.tz(date, VN_TZ).startOf("day");
  let next = first.add(1, "day");
  if (period === "weekly") {
    first = first.subtract((first.day() + 6) % 7, "day");
    next = first.add(7, "day");
  } else if (period === "monthly" || period === "quarterly") {
    first = first.startOf("month");
    if (period === "quarterly") first = first.month(Math.floor(first.month() / 3) * 3);
    next = first.add(period === "quarterly" ? 3 : 1, "month");
  }
  return { start: first.hour(3).toISOString(), end: next.hour(3).toISOString() };
}
