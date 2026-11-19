// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { EmployeeShiftOverride } from "./ShiftReminderSettings";

const http = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), delete: vi.fn() }));
vi.mock("@/utils/http", () => ({ default: http }));
vi.mock("@/hooks/usePermission", () => ({ useIsAdmin: () => true }));
vi.mock("@/hooks/use-users", () => ({ useUsers: () => ({ users: [{ _id: "u1", name: "A" }], pagination: { total_pages: 1 } }) }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: Root;
afterEach(() => { if (root) act(() => root.unmount()); document.body.innerHTML = ""; vi.useRealTimers(); vi.resetAllMocks(); });
const flush = async () => { await act(async () => { await new Promise(r => setTimeout(r, 40)); }); };
async function change(element: HTMLInputElement | HTMLSelectElement, value: string) {
  await act(async () => {
    const proto = element instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, "value")!.set!.call(element, value);
    element.dispatchEvent(new Event("change", { bubbles: true }));
    element.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await flush();
}
async function setup(existing: number | null = null) {
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date(2026, 10, 18, 12));
  http.get.mockImplementation(async (url: string) => ({ data: url.endsWith('/config') ? { enabled: true, period: 'week', requiredDays: 5, deadlineDay: 1, deadlineTime: '20:00', frequencyMinutes: 60 } : existing === null ? { override: null } : { requiredDays: existing } }));
  http.put.mockResolvedValue({ data: {} }); http.delete.mockResolvedValue({});
  const host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await act(async () => { root.render(createElement(QueryClientProvider, { client }, createElement(EmployeeShiftOverride, { userId: 'u1' }))); }); await flush();
  await act(async () => button(host, 'Tuần này').click()); await flush();
  return host;
}
function button(host: HTMLElement, text: string) { return [...host.querySelectorAll('button')].find(b => b.textContent?.includes(text))!; }
it('navigates weeks across years without saving or carrying drafts', async () => {
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date(2026, 11, 30, 12));
  http.get.mockImplementation(async (url: string) => ({ data: url.endsWith('/config') ? { enabled: true, period: 'week', requiredDays: 5, deadlineDay: 1, deadlineTime: '20:00', frequencyMinutes: 60 } : { override: null } }));
  http.put.mockResolvedValue({ data: {} });
  const host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await act(async () => root.render(createElement(QueryClientProvider, { client }, createElement(EmployeeShiftOverride, { userId: 'u1' })))); await flush();
  expect(host.textContent).toContain('04/01/2027 – 10/01/2027');
  await act(async () => button(host, 'Tuần này').click()); await flush();
  expect(host.textContent).toContain('28/12/2026 – 03/01/2027');
  await flush();
  const reduction = () => [...host.querySelectorAll('input')].find(i => i.closest('label')?.textContent?.includes('Số ngày được giảm'))!;
  const input = reduction(); await change(input, '2');
  await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="Tuần tiếp theo"]')!.click()); await flush();
  expect(reduction().value).toBe('');
  expect(http.put).not.toHaveBeenCalled();
  await change(reduction(), '1');
  await act(async () => button(host, 'Lưu ngoại lệ').click()); await flush();
  expect(http.put).toHaveBeenCalledWith('/shift-reminders/overrides/u1/2027-01-04', { requiredDays: 4 });
});
it('converts a reduction into the backend requiredDays snapshot', async () => {
  const host = await setup();
  const input = [...host.querySelectorAll('input')].find(i => i.closest('label')?.textContent?.includes('Số ngày được giảm'))!;
  await change(input, '2');
  expect(host.textContent).toContain('5 − 2 = 3');
  await act(async () => button(host, 'Lưu ngoại lệ').click()); await flush();
  expect(http.put).toHaveBeenCalledWith('/shift-reminders/overrides/u1/2026-11-16', { requiredDays: 3 });
});
it('preserves a zero override and supports zero reduction', async () => {
  const host = await setup(0);
  expect(host.textContent).toContain('Ngoại lệ hiện tại: 0 ngày');
  const input = [...host.querySelectorAll('input')].find(i => i.closest('label')?.textContent?.includes('Số ngày được giảm'))!;
  expect(input.value).toBe('5');
  await change(input, '0');
  await act(async () => button(host, 'Lưu ngoại lệ').click()); await flush();
  expect(http.put).toHaveBeenCalledWith('/shift-reminders/overrides/u1/2026-11-16', { requiredDays: 5 });
});
it('updates an existing exception to a full reduction and can delete it', async () => {
  const host = await setup(3);
  const input = [...host.querySelectorAll('input')].find(i => i.closest('label')?.textContent?.includes('Số ngày được giảm'))!;
  expect(input.value).toBe('2');
  await change(input, '5');
  expect(host.textContent).toContain('5 − 5 = 0');
  await act(async () => button(host, 'Lưu ngoại lệ').click()); await flush();
  expect(http.put).toHaveBeenCalledWith('/shift-reminders/overrides/u1/2026-11-16', { requiredDays: 0 });
  await act(async () => button(host, 'Xóa ngoại lệ').click()); await flush();
  expect(http.delete).toHaveBeenCalledWith('/shift-reminders/overrides/u1/2026-11-16');
});
it('shows an old exception above the general level without a negative reduction', async () => {
  const host = await setup(7);
  expect(host.textContent).toContain('cao hơn mức chung');
  const input = [...host.querySelectorAll('input')].find(i => i.closest('label')?.textContent?.includes('Số ngày được giảm'))!;
  expect(input.value).toBe('');
  expect(button(host, 'Lưu ngoại lệ').disabled).toBe(true);
});
it('rechecks the persisted general setting before saving', async () => {
  const host = await setup();
  const input = [...host.querySelectorAll('input')].find(i => i.closest('label')?.textContent?.includes('Số ngày được giảm'))!;
  await change(input, '2');
  http.get.mockImplementation(async (url: string) => ({ data: url.endsWith('/config') ? { enabled: true, period: 'week', requiredDays: 4, deadlineDay: 1, deadlineTime: '20:00', frequencyMinutes: 60 } : { override: null } }));
  await act(async () => button(host, 'Lưu ngoại lệ').click()); await flush();
  expect(http.put).not.toHaveBeenCalled();
  expect(host.textContent).toContain('Mức chung đã lưu: 4 ngày');
});
it('does not edit an exception for a different configured period', async () => {
  const host = await setup();
  const period = [...host.querySelectorAll('select')].find(s => s.parentElement?.textContent?.includes('Chu kỳ ngoại lệ'))!;
  await change(period, 'month');
  await change(host.querySelector('input[type=month]')!, '2026-11');
  expect(host.textContent).toContain('khác chu kỳ cấu hình');
  expect(button(host, 'Lưu ngoại lệ').disabled).toBe(true);
});
it('preserves monthly override editing with the monthly baseline and first of month', async () => {
  http.get.mockImplementation(async (url: string) => ({ data: url.endsWith('/config') ? { enabled: true, period: 'month', requiredDays: 20, deadlineDay: 1, monthlyDeadlineDay: 1, deadlineTime: '20:00', frequencyMinutes: 60 } : { override: null } }));
  http.put.mockResolvedValue({ data: {} });
  const host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await act(async () => root.render(createElement(QueryClientProvider, { client }, createElement(EmployeeShiftOverride, { userId: 'u1' })))); await flush();
  await change(host.querySelector('select')!, 'month');
  await change(host.querySelector('input[type=month]')!, '2026-11');
  const input = [...host.querySelectorAll('input')].find(i => i.closest('label')?.textContent?.includes('Số ngày được giảm'))!;
  await change(input, '2');
  await act(async () => button(host, 'Lưu ngoại lệ').click()); await flush();
  expect(http.put).toHaveBeenCalledWith('/shift-reminders/overrides/u1/2026-11-01?period=month', { requiredDays: 18 });
});
