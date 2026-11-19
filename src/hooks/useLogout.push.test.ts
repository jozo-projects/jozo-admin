// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { useLogout } from './useLogout';
const mocks = vi.hoisted(() => ({ suppressPush: vi.fn(), disablePush: vi.fn(), logout: vi.fn(), navigate: vi.fn(), toast: vi.fn() }));
vi.mock('@/services/shift-push', () => mocks);
vi.mock('@/apis/authorization.apis', () => ({ default: { logout: mocks.logout } }));
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => mocks.navigate }));
vi.mock('./use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
beforeEach(() => {
  const storage = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) });
});
afterEach(() => { vi.resetAllMocks(); vi.unstubAllGlobals(); });
async function perform() {
  const host = document.createElement('div'); const root = createRoot(host);
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  function Test() { const { logout } = useLogout(); return createElement('button', { onClick: logout }); }
  await act(async () => root.render(createElement(QueryClientProvider, { client }, createElement(Test))));
  await act(async () => { host.querySelector('button')!.click(); await new Promise(resolve => setTimeout(resolve, 20)); });
  act(() => root.unmount());
}
it('revokes before auth logout and removes tokens despite remote failure', async () => {
  localStorage.setItem('access_token', 'token'); localStorage.setItem('refresh_token', 'refresh');
  mocks.disablePush.mockImplementation(async () => { expect(localStorage.getItem('access_token')).toBe('token'); expect(mocks.suppressPush).toHaveBeenCalledWith(true); return false; });
  mocks.logout.mockImplementation(async () => { expect(mocks.disablePush).toHaveBeenCalled(); throw new Error('offline'); });
  await perform(); expect(localStorage.getItem('access_token')).toBeNull(); expect(mocks.navigate).toHaveBeenCalled();
  expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive', description: expect.stringContaining('máy chủ') }));
});
it('retains session if local suppression cannot complete', async () => {
  localStorage.setItem('access_token', 'token'); mocks.suppressPush.mockRejectedValue(new Error('storage unavailable'));
  await perform(); expect(localStorage.getItem('access_token')).toBe('token'); expect(mocks.logout).not.toHaveBeenCalled(); expect(mocks.navigate).not.toHaveBeenCalled();
});
it('cleans up even without refresh token', async () => {
  localStorage.setItem('access_token', 'token'); await perform();
  expect(mocks.disablePush).toHaveBeenCalled(); expect(localStorage.getItem('access_token')).toBeNull();
});
it('does not navigate or erase the new account when a switch races logout', async () => {
  localStorage.setItem('access_token', 'old');
  mocks.disablePush.mockImplementation(async () => { localStorage.setItem('access_token', 'new'); return true; });
  await perform();
  expect(localStorage.getItem('access_token')).toBe('new');
  expect(mocks.navigate).not.toHaveBeenCalled();
  expect(mocks.logout).not.toHaveBeenCalled();
});
