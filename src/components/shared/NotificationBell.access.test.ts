// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { act, createElement, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { NotificationBell } from './NotificationBell';
const state = vi.hoisted(() => ({ admin: false }));
vi.mock('@/hooks/usePermission', () => ({ useIsAdmin: () => state.admin }));
vi.mock('@/hooks/use-notifications', () => ({ NOTIFICATION_QUERY_KEYS: { all: ['notifications'] }, useNotifications: () => ({ data: { notifications: [{ _id: '1', title: 'Tin nhắn', body: 'Nội dung', isRead: false, createdAt: new Date().toISOString() }] } }), useMarkAsRead: () => ({ mutate: vi.fn() }), useDeleteNotification: () => ({ mutate: vi.fn() }) }));
vi.mock('@/hooks/useSocket', () => ({ useSocket: () => ({ onNewNotification: vi.fn(), offNewNotification: vi.fn() }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: vi.fn() }) }));
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => vi.fn() }));
vi.mock('@/components/ui/dropdown-menu', () => { const Container = ({ children }: { children: ReactNode }) => createElement('div', null, children); return { DropdownMenu: Container, DropdownMenuTrigger: Container, DropdownMenuContent: Container, DropdownMenuItem: Container }; });
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: Root;
afterEach(() => { if (root) act(() => root.unmount()); document.body.innerHTML = ''; });
it('shows notifications to staff but delete only to admin', async () => {
 const host = document.createElement('div'); document.body.append(host); root = createRoot(host);
 state.admin = false; await act(async () => root.render(createElement(NotificationBell)));
 expect(host.textContent).toContain('Tin nhắn'); expect(host.querySelector('[aria-label="Xóa thông báo"]')).toBeNull();
 state.admin = true; await act(async () => root.render(createElement(NotificationBell)));
 expect(host.querySelector('[aria-label="Xóa thông báo"]')).not.toBeNull();
});
