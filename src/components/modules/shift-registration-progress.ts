export type PersonalProgress = { week?: string; month?: string; enabled: boolean; requiredDays: number; registeredDays: number; deadline?: string; activePeriod: "week" | "month" };

export function registrationSuccessDescription(data: PersonalProgress | undefined, date: string): string {
  const base = "Đăng ký ca thành công. Vui lòng chờ quản lý duyệt.";
  if (!data?.enabled) return base;
  const start = data.activePeriod === "month" ? data.month : data.week;
  if (!start) return base;
  const end = new Date(`${start}T00:00:00Z`);
  if (data.activePeriod === "month") end.setUTCMonth(end.getUTCMonth() + 1);
  else end.setUTCDate(end.getUTCDate() + 7);
  const period = data.activePeriod === "month" ? "tháng tới" : "tuần tới";
  if (date < start || date >= end.toISOString().slice(0, 10)) return `${base} Ngày này ngoài ${period}; xem tiến độ ${period} trên lịch.`;
  const remaining = data.requiredDays - data.registeredDays;
  return `${base} ${period === "tuần tới" ? "Tuần tới" : "Tháng tới"}: ${data.registeredDays}/${data.requiredDays} ngày. ${remaining <= 0 ? "Đã đủ số ngày yêu cầu." : `Còn ${remaining} ngày cần đăng ký.`}`;
}
