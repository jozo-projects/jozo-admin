// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Page from './ManualNotificationPage';
import StaffPage from './index';
const state = vi.hoisted(() => ({ admin: true }));
vi.mock('@/hooks/usePermission', () => ({ useIsAdmin: () => state.admin }));
vi.mock('@/hooks/use-users', () => ({ useUsers: ({ search }: { search?: string }) => ({ users: [{ _id: search ? 'b' : 'a', name: search ? 'Bình' : 'An', role: 'staff', date_of_birth: '2000-01-01', created_at: '2026-01-01' }], pagination: { total: 1, total_pages: 1 } }) }));
vi.mock('@tanstack/react-router', () => ({ useRouter: () => ({ navigate: vi.fn() }) }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: Root;
afterEach(() => { if (root) act(() => root.unmount()); document.body.innerHTML = ''; state.admin = true; });
async function setup(component = Page) { const host = document.createElement('div'); document.body.append(host); root = createRoot(host); await act(async () => root.render(createElement(QueryClientProvider, { client: new QueryClient() }, createElement(component)))); return host; }
it('keeps selected staff when searching a different page of results', async () => { const host = await setup(); await act(async () => [...host.querySelectorAll('button')].find(b => b.textContent === 'Tạo thông báo')!.click()); await act(async () => document.querySelector<HTMLInputElement>('input[type=checkbox]')!.click()); const search = document.querySelector<HTMLInputElement>('input[placeholder]')!; await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(search, 'Bình'); search.dispatchEvent(new Event('input', { bubbles: true })); }); await act(async () => document.querySelector<HTMLInputElement>('input[type=checkbox]')!.click()); expect(document.body.textContent).toContain('Đã chọn 2'); expect(document.querySelector('[aria-label="Bỏ chọn An"]')).toBeTruthy(); expect(document.querySelector('[aria-label="Bỏ chọn Bình"]')).toBeTruthy(); });
it('does not show composer or selection to non-admin', async () => { state.admin = false; const host = await setup(StaffPage); expect(host.textContent).not.toContain('Gửi thông báo cho nhân viên'); expect(host.querySelector('input[type=checkbox]')).toBeNull(); });
