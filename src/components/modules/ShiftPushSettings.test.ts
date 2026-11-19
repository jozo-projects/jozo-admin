// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ShiftPushSettings from './ShiftPushSettings';
const push = vi.hoisted(() => ({ pushSupport: vi.fn(), pushEnabled: vi.fn(), getPushConfig: vi.fn(), enablePush: vi.fn(), disablePush: vi.fn() }));
vi.mock('@/services/shift-push', () => push);
vi.mock('@/hooks/useAuth', () => ({ default: () => ({ user: { _id: 'a' } }) }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: Root;
let host: HTMLDivElement;
beforeEach(() => {
  vi.clearAllMocks();
  push.pushSupport.mockReturnValue(null); push.pushEnabled.mockResolvedValue(false);
  push.getPushConfig.mockResolvedValue({ configured: true, publicKey: 'vapid' });
  push.enablePush.mockResolvedValue(undefined);
  vi.stubGlobal('Notification', { permission: 'default' });
  host = document.createElement('div'); root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); vi.unstubAllGlobals(); });
async function render() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await act(async () => { root.render(createElement(QueryClientProvider, { client }, createElement(ShiftPushSettings))); });
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); });
}
it('never opts in on mount; enables only on button click with public key', async () => {
  await render(); expect(push.enablePush).not.toHaveBeenCalled();
  expect(host.textContent).toContain('không đảm bảo');
  await act(async () => { host.querySelector('button')!.click(); });
  expect(push.enablePush).toHaveBeenCalledWith('a', 'vapid');
});
it('disables opt-in for denied permission or unconfigured backend', async () => {
  vi.stubGlobal('Notification', { permission: 'denied' });
  push.getPushConfig.mockResolvedValue({ configured: false, publicKey: '' });
  await render(); expect(host.querySelector('button')!.disabled).toBe(true);
  expect(host.textContent).toContain('Đã chặn'); expect(host.textContent).toContain('chưa sẵn sàng');
});
it('shows iOS guidance without requesting backend config', async () => {
  push.pushSupport.mockReturnValue('Thêm Jozo vào Màn hình chính');
  await render(); expect(host.textContent).toContain('Màn hình chính');
  expect(push.getPushConfig).not.toHaveBeenCalled(); expect(host.querySelector('button')!.disabled).toBe(true);
});
it('does not call an old local subscription active when backend is not ready', async () => {
  push.pushEnabled.mockResolvedValue(true);
  push.getPushConfig.mockResolvedValue({ configured: false, publicKey: null });
  await render();
  expect(host.textContent).toContain('chưa sẵn sàng');
  expect(host.textContent).not.toContain('Đã bật cho tài khoản này.');
  expect(host.querySelector('button')!.disabled).toBe(true);
});
it('shows local suppression when server revocation fails', async () => {
  push.disablePush.mockResolvedValue(false); await render();
  await act(async () => { host.querySelectorAll('button')[1].click(); });
  expect(host.textContent).toContain('chưa xác nhận xóa đăng ký máy chủ');
});
