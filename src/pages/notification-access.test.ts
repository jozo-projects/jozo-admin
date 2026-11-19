// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MENU_ITEMS } from '@/constants/menuItems';
import PATHS from '@/constants/paths';
import { Role } from '@/constants/enum';
import NotificationsPage from './NotificationsPage';
const state = vi.hoisted(() => ({ admin: false, remove: vi.fn() }));
vi.mock('@/hooks/usePermission', () => ({ useIsAdmin: () => state.admin }));
vi.mock('@/hooks/use-notifications', () => ({ useNotifications: () => ({ data: { notifications: [{ _id: '1', title: 'Test', body: 'Body', isRead: false, createdAt: new Date().toISOString() }] } }), useMarkAsRead: () => ({ mutate: vi.fn() }), useMarkAllAsRead: () => ({ mutate: vi.fn() }), useDeleteNotification: () => ({ mutate: state.remove }) }));
vi.mock('@tanstack/react-router', () => ({ useRouter: () => ({ navigate: vi.fn() }) }));
vi.mock('@/components/shared', () => ({ PageHeader: () => null }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: Root;
afterEach(() => { if (root) act(() => root.unmount()); document.body.innerHTML = ''; });
it('places personal notifications in Cá nhân and admin management after Cài đặt chung', () => {
  expect(MENU_ITEMS.find(i => i.url === PATHS.NOTIFICATIONS)).toMatchObject({ section: 'personal', roles: [Role.Admin, Role.Staff] });
  expect(MENU_ITEMS.find(i => i.url === PATHS.MANUAL_NOTIFICATION)).toMatchObject({ section: 'settings', roles: [Role.Admin] });
  const settings = MENU_ITEMS.filter(i => i.section === 'settings');
  expect(settings.findIndex(i => i.url === PATHS.MANUAL_NOTIFICATION)).toBe(settings.findIndex(i => i.url === PATHS.CALENDAR) + 1);
});
it('renders delete only for admin and keeps the notification readable for staff', async () => {
  const host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  state.admin = false; await act(async () => root.render(createElement(NotificationsPage)));
  expect(host.textContent).toContain('Test'); expect(host.querySelector('[aria-label="Xóa thông báo"]')).toBeNull();
  state.admin = true; await act(async () => root.render(createElement(NotificationsPage)));
  expect(host.querySelector('[aria-label="Xóa thông báo"]')).not.toBeNull();
});
