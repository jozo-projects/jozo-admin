// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { act, createElement, Suspense } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ManualNotificationRoute } from '@/router/route-components/users';
import { MENU_ITEMS } from '@/constants/menuItems';
import PATHS from '@/constants/paths';
import { Role } from '@/constants/enum';
const state = vi.hoisted(() => ({ role: 'staff', navigate: vi.fn() }));
vi.mock('@/hooks/useAuth', () => ({ default: () => ({ isAuthenticated: true, isLoading: false, user: { role: state.role } }) }));
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => state.navigate }));
vi.mock('@/router/router-boundaries', () => ({ RouterLoading: () => createElement('div', null, 'loading') }));
vi.mock('./ManualNotificationPage', () => ({ default: () => createElement('div', null, 'Composer page') }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: Root;
afterEach(() => { if (root) act(() => root.unmount()); document.body.innerHTML = ''; state.navigate.mockReset(); });
it('limits menu and route to administrators', async () => {
  const item = MENU_ITEMS.flatMap(group => group.subItems || [group]).find(entry => entry.url === PATHS.MANUAL_NOTIFICATION);
  expect(item?.roles).toEqual([Role.Admin]);
  const host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  state.role = Role.Staff;
  await act(async () => root.render(createElement(Suspense, null, createElement(ManualNotificationRoute))));
  expect(host.textContent).not.toContain('Composer page');
  expect(state.navigate).toHaveBeenCalledWith({ to: '/unauthorized', replace: true });
  state.role = Role.Admin;
  await act(async () => root.render(createElement(Suspense, null, createElement(ManualNotificationRoute))));
  expect(host.textContent).toContain('Composer page');
});
