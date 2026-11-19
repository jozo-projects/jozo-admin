// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { isDays, isFrequency, isMonday, isMonth, shiftReminderApis } from "@/apis/shift-reminder.apis";
import ShiftReminderSettings, { weekStartForDate } from "./ShiftReminderSettings";

const http = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), delete: vi.fn() }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
vi.mock("@/utils/http", () => ({ default: http }));
vi.mock("@/hooks/usePermission", () => ({ useIsAdmin: () => true }));
vi.mock("@/hooks/use-users", () => ({ useUsers: () => ({ users: [{ _id: "0123456789abcdef01234567", name: "Nhân viên A" }], pagination: { total_pages: 1 } }) }));

let root: Root | undefined;
afterEach(() => { if (root) act(() => root?.unmount()); root = undefined; document.body.innerHTML = ""; vi.clearAllMocks(); });

describe("shift reminder settings", () => {
  it("maps any selected day to its Monday, including year boundaries", () => {
    expect(weekStartForDate("2026-11-22")).toBe("2026-11-16");
    expect(weekStartForDate("2027-01-01")).toBe("2026-12-28");
    expect(weekStartForDate("")).toBe("");
    expect(weekStartForDate("2026-02-30")).toBe("");
  });
  it("validates input boundaries and Monday dates", () => {
    expect(["0", "7", "8", "", "1.5"].map(value => isDays(value))).toEqual([true, true, false, false, false]);
    expect(["1", "10080", "0", "10081"].map(isFrequency)).toEqual([true, true, false, false]);
    expect(["2026-11-16", "2026-11-17", "2026-02-30"].map(isMonday)).toEqual([true, false, false]);
  });
  it("validates monthly boundaries and sends month override queries", async () => {
    expect(["0", "31", "32"].map(v => isDays(v, "month"))).toEqual([true, true, false]);
    expect(["2026-02-01", "2026-13-01", "2026-02-02"].map(isMonth)).toEqual([true, false, false]);
    http.get.mockResolvedValue({ data: { override: null } }); http.put.mockResolvedValue({ data: { requiredDays: 31 } }); http.delete.mockResolvedValue({});
    await shiftReminderApis.getOverride("user", "2026-02-01", "month");
    await shiftReminderApis.saveOverride("user", "2026-02-01", 31, "month");
    await shiftReminderApis.deleteOverride("user", "2026-02-01", "month");
    expect(http.get).toHaveBeenCalledWith("/shift-reminders/overrides/user/2026-02-01?period=month");
    expect(http.put).toHaveBeenCalledWith("/shift-reminders/overrides/user/2026-02-01?period=month", { requiredDays: 31 });
    expect(http.delete).toHaveBeenCalledWith("/shift-reminders/overrides/user/2026-02-01?period=month");
  });
  it("uses exact API shapes including zero and delete", async () => {
    http.put.mockResolvedValue({ data: { requiredDays: 0 } }); http.delete.mockResolvedValue({});
    await shiftReminderApis.saveOverride("0123456789abcdef01234567", "2026-11-16", 0);
    await shiftReminderApis.deleteOverride("0123456789abcdef01234567", "2026-11-16");
    expect(http.put).toHaveBeenCalledWith("/shift-reminders/overrides/0123456789abcdef01234567/2026-11-16", { requiredDays: 0 });
    expect(http.delete).toHaveBeenCalledWith("/shift-reminders/overrides/0123456789abcdef01234567/2026-11-16");
  });
  it("shows a readable reminder interval while preserving a custom saved value", async () => {
    http.get.mockResolvedValue({ data: { enabled: false, requiredDays: 3, deadlineDay: 1, deadlineTime: "20:00", frequencyMinutes: 75 } });
    const host = document.createElement("div"); document.body.append(host); root = createRoot(host);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    await act(async () => { root!.render(createElement(QueryClientProvider, { client }, createElement(ShiftReminderSettings))); await new Promise(resolve => setTimeout(resolve, 60)); });
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 30)); });
    expect(host.textContent).toContain("Mỗi 1 giờ");
    expect(host.textContent).toContain("Tùy chỉnh");
    expect((host.querySelector('input[aria-label="Số phút tùy chỉnh"]') as HTMLInputElement).value).toBe("75");
  });
  it("renders loaded settings without an employee selector", async () => {
    http.get.mockResolvedValue({ data: { enabled: false, requiredDays: 3, deadlineDay: 1, deadlineTime: "20:00", frequencyMinutes: 60 } });
    const host = document.createElement("div"); document.body.append(host); root = createRoot(host);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    await act(async () => { root!.render(createElement(QueryClientProvider, { client }, createElement(ShiftReminderSettings))); await new Promise(resolve => setTimeout(resolve, 30)); });
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 30)); });
    expect(host.textContent).not.toContain("Nhân viên A");
    expect(host.textContent).toContain("Quản lý Admin/Staff");
    expect(host.textContent).toContain("Lưu cấu hình");
    expect(http.get).toHaveBeenCalledWith("/shift-reminders/config");
  });
});
