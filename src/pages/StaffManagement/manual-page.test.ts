// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import Page from './ManualNotificationPage';
vi.mock('@/components/shared', () => ({ PageHeader: () => null }));
vi.mock('@/hooks/use-users', () => ({ useUsers: ({ page }: {page: number}) => ({ users: [{ _id: page === 1 ? 'a' : 'b', name: page === 1 ? 'An' : 'Bình', role: 'staff' }], pagination: { total: 2, total_pages: 2 } }) }));
vi.mock('./ManualNotification', () => ({ default: ({selected}: {selected: {name: string}[]}) => createElement('div', null, `Đã chọn ${selected.length}: ${selected.map(x => x.name).join(', ')}`) }));
vi.mock('./ManualNotificationHistory', () => ({ default: () => createElement('div', null, 'Lịch sử thông báo') }));
vi.mock('@/pages/RecruitmentPage/components/PaginationContainer', () => ({ default: ({onPageChange}: {onPageChange: (page: number) => void}) => createElement('button', {onClick: () => onPageChange(2)}, 'Trang 2') }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: Root;
afterEach(() => { if (root) act(() => root.unmount()); document.body.innerHTML = ''; });
it('opens the composer and retains selected staff across pages', async () => { const host = document.createElement('div'); document.body.append(host); root = createRoot(host); await act(async () => root.render(createElement(Page))); expect(host.textContent).toContain('Lịch sử thông báo'); expect(document.querySelector('[role=dialog]')).toBeNull(); await act(async () => [...host.querySelectorAll('button')].find(b => b.textContent === 'Tạo thông báo')!.click()); expect(document.querySelector('[role=dialog]')).toBeTruthy(); await act(async () => document.querySelector<HTMLInputElement>('input[type=checkbox]')!.click()); await act(async () => [...document.querySelectorAll('button')].find(b => b.textContent === 'Trang 2')!.click()); await act(async () => document.querySelector<HTMLInputElement>('input[type=checkbox]')!.click()); expect(document.body.textContent).toContain('Đã chọn 2: An, Bình'); });
