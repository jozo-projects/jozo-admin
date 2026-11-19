// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import StaffManagementPage from './index';
const http = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), delete: vi.fn() }));
vi.mock('@/utils/http', () => ({ default: http }));
vi.mock('@/hooks/usePermission', () => ({ useIsAdmin: () => true }));
vi.mock('@/hooks/use-users', () => ({ useUsers: () => ({ users: [{ _id: '0123456789abcdef01234567', name: 'An', role: 'staff', date_of_birth: '2000-01-01', created_at: '2026-01-01' }], pagination: { total: 1, total_pages: 1 } }) }));
vi.mock('@tanstack/react-router', () => ({ useRouter: () => ({ navigate: vi.fn() }) }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: Root;
afterEach(() => { if (root) act(() => root.unmount()); document.body.innerHTML = ''; vi.useRealTimers(); vi.resetAllMocks(); });
const flush = async () => { await act(async () => { await new Promise(r => setTimeout(r, 50)); }); };
async function change(element: HTMLInputElement, value: string) { await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(element, value); element.dispatchEvent(new Event('input', { bubbles: true })); element.dispatchEvent(new Event('change', { bubbles: true })); }); await flush(); }
it('opens the selected staff action and saves only the selected week', async () => {
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date(2026, 10, 18, 12));
  http.get.mockImplementation(async (url: string) => ({ data: url.endsWith('/config') ? { enabled: true, period: 'week', requiredDays: 5, deadlineDay: 1, deadlineTime: '20:00', frequencyMinutes: 60 } : { override: null } }));
  http.put.mockResolvedValue({ data: {} });
  const host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await act(async () => root.render(createElement(QueryClientProvider, { client }, createElement(StaffManagementPage)))); await flush();
  const action = [...host.querySelectorAll('button')].find(b => b.textContent?.includes('Ngoại lệ đăng ký ca'));
  expect(action).toBeTruthy();
  await act(async () => action!.click()); await flush();
  await act(async () => [...host.querySelectorAll('button')].find(b => b.textContent === 'Tuần này')!.click()); await flush();
  expect(host.textContent).toContain('16/11/2026 – 22/11/2026');
  const input = [...host.querySelectorAll('input')].find(i => i.closest('label')?.textContent?.includes('Số ngày được giảm'))!;
  await change(input, '2');
  await act(async () => [...host.querySelectorAll('button')].find(b => b.textContent?.includes('Lưu ngoại lệ'))!.click()); await flush();
  expect(http.put).toHaveBeenCalledWith('/shift-reminders/overrides/0123456789abcdef01234567/2026-11-16', { requiredDays: 3 });
});
