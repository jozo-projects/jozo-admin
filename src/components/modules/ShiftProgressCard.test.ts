// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ShiftProgressCard, { nextVietnamWeek } from "./ShiftProgressCard";

const http = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@/utils/http", () => ({ default: http }));
vi.mock("@/hooks/useAuth", () => ({ default: () => ({ user: { _id: "u1" } }) }));
vi.mock("@tanstack/react-router", () => ({ Link: ({ children, to }: { children: React.ReactNode; to: string }) => createElement("a", { href: to }, children) }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: Root | undefined;
afterEach(() => { if (root) act(() => root?.unmount()); root = undefined; document.body.innerHTML = ""; vi.clearAllMocks(); });
async function render() {
  const host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await act(async () => { root!.render(createElement(QueryClientProvider, { client }, createElement(ShiftProgressCard))); });
  return host;
}
async function flush() { await act(async () => { await new Promise(resolve => setTimeout(resolve, 30)); }); }
describe("personal shift progress", () => {
  it("keeps completed progress visible above the registration calendar", async () => {
    http.get.mockResolvedValue({ data: { enabled: true, week: "2026-11-16", requiredDays: 3, registeredDays: 3 } });
    const host = document.createElement("div"); document.body.append(host); root = createRoot(host);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    await act(async () => { root!.render(createElement(QueryClientProvider, { client }, createElement(ShiftProgressCard, { calendar: true }))); });
    await flush();
    expect(host.textContent).toContain("3/3");
    expect(host.textContent).toContain("tuần tới");
  });
  it("calculates next Monday in Vietnam across UTC and year boundaries", () => {
    expect(nextVietnamWeek(new Date("2026-11-15T16:59:59Z"))).toBe("2026-11-16");
    expect(nextVietnamWeek(new Date("2026-11-15T17:00:00Z"))).toBe("2026-11-23");
    expect(nextVietnamWeek(new Date("2026-12-31T20:00:00Z"))).toBe("2027-01-04");
  });
  it("shows loading, then zero requirement as complete and links to schedule", async () => {
    let resolve!: (v: unknown) => void;
    http.get.mockReturnValue(new Promise(r => { resolve = r; }));
    const host = await render();
    expect(host.textContent).toContain("Đang tải");
    await act(async () => { resolve({ data: { enabled: true, week: "2026-11-16", requiredDays: 0, registeredDays: 0, deadline: "2026-11-15T13:30:00.000Z" } }); });
    await flush();
    expect(host.textContent).not.toContain("Đăng ký ca");
    expect(host.querySelector("a")).toBeNull();
    expect(http.get.mock.calls[0][0]).toBe("/shift-reminders/me/progress");
    expect(http.get.mock.calls[0][1].params.week).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  it("uses monthly progress only after the backend reports a period mismatch", async () => {
    http.get.mockResolvedValueOnce({ data: { error: "PERIOD_MISMATCH" } });
    http.get.mockResolvedValueOnce({ data: { enabled: true, month: "2026-12-01", requiredDays: 20, registeredDays: 4, deadline: "2026-11-30T13:30:00.000Z" } });
    const host = await render(); await flush();
    expect(host.textContent).toContain("tháng tới");
    expect(host.textContent).toContain("4/20");
    expect(host.textContent).toContain("30/11/2026");
    expect(http.get.mock.calls[1][1].params.month).toMatch(/^\d{4}-\d{2}-01$/);
  });
  it("shows an error rather than pretending progress is zero", async () => {
    http.get.mockRejectedValue(new Error("offline"));
    const host = await render(); await flush();
    expect(host.textContent).toContain("Không thể tải");
    expect(host.textContent).not.toContain("0/0");
  });
  it("refetches when Home is revisited after registration changes", async () => {
    http.get.mockResolvedValueOnce({ data: { enabled: true, week: "2026-11-16", requiredDays: 3, registeredDays: 1 } });
    http.get.mockResolvedValueOnce({ data: { enabled: true, week: "2026-11-16", requiredDays: 3, registeredDays: 3 } });
    const host = document.createElement("div"); document.body.append(host); root = createRoot(host);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const view = () => createElement(QueryClientProvider, { client }, createElement(ShiftProgressCard));
    await act(async () => { root!.render(view()); }); await flush();
    expect(host.textContent).toContain("1/3");
    await act(async () => { root!.render(createElement(QueryClientProvider, { client }, null)); });
    await act(async () => { root!.render(view()); }); await flush();
    expect(host.textContent).not.toContain("Đăng ký ca");
    expect(http.get).toHaveBeenCalledTimes(2);
  });
  it("shows disabled and incomplete states accurately", async () => {
    http.get.mockResolvedValueOnce({ data: { enabled: false, week: "2026-11-16", requiredDays: 3, registeredDays: 0 } });
    const host = await render(); await flush(); expect(host.textContent).toContain("đang tắt");
    act(() => root!.unmount()); root = undefined;
    http.get.mockResolvedValueOnce({ data: { enabled: true, week: "2026-11-16", requiredDays: 3, registeredDays: 1 } });
    const host2 = await render(); await flush(); expect(host2.textContent).toContain("1/3"); expect(host2.textContent).toContain("Còn 2 ngày");
  });
});
