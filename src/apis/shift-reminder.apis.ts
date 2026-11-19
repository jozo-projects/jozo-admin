import http from "@/utils/http";

export type ReminderPeriod = "week" | "month";
export type ReminderConfig = {
  enabled: boolean;
  requiredDays: number;
  deadlineDay: number;
  deadlineTime: string;
  frequencyMinutes: number;
  period?: ReminderPeriod;
  monthlyDeadlineDay?: number;
};
export type ReminderOverride = { requiredDays: number } | { override: null };

const overridePath = (userId: string, date: string, period: ReminderPeriod = "week") =>
  `/shift-reminders/overrides/${encodeURIComponent(userId)}/${encodeURIComponent(date)}${period === "month" ? "?period=month" : ""}`;

export const shiftReminderApis = {
  getConfig: async () => (await http.get<ReminderConfig>("/shift-reminders/config")).data,
  saveConfig: async (config: ReminderConfig) => (await http.put<ReminderConfig>("/shift-reminders/config", config)).data,
  getOverride: async (userId: string, date: string, period: ReminderPeriod = "week") => (await http.get<ReminderOverride>(overridePath(userId, date, period))).data,
  saveOverride: async (userId: string, date: string, requiredDays: number, period: ReminderPeriod = "week") =>
    (await http.put<ReminderOverride>(overridePath(userId, date, period), { requiredDays })).data,
  deleteOverride: async (userId: string, date: string, period: ReminderPeriod = "week") => { await http.delete(overridePath(userId, date, period)); },
};

export const isDays = (value: string, period: ReminderPeriod = "week") => /^\d+$/.test(value) && Number(value) <= (period === "month" ? 31 : 7);
export const isFrequency = (value: string) => /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) && Number(value) >= 1 && Number(value) <= 10080;
export const isMonday = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value && date.getUTCDay() === 1;
};
export const isMonth = (value: string) => {
  if (!/^\d{4}-\d{2}-01$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};
