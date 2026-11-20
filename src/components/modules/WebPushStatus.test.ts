// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import WebPushStatus from './WebPushStatus';
const api = vi.hoisted(() => ({ getPushConfig: vi.fn() }));
vi.mock('@/services/shift-push', () => api);
vi.mock('@/hooks/useAuth', () => ({ default: () => ({ user: { _id: 'admin' } }) }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: Root, host: HTMLDivElement;
beforeEach(() => { vi.clearAllMocks(); host = document.createElement('div'); root = createRoot(host); });
afterEach(() => { act(() => root.unmount()); vi.unstubAllGlobals(); });
async function render() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await act(async () => { root.render(createElement(QueryClientProvider, { client }, createElement(WebPushStatus))); });
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); });
}
it('displays and copies only the public key when ready', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  api.getPushConfig.mockResolvedValue({ configured: true, publicKey: 'public-example', privateKey: 'secret-example' });
  await render();
  expect(host.textContent).toContain('public-example');
  expect(host.textContent).not.toContain('secret-example');
  await act(async () => { host.querySelector('button')!.click(); });
  expect(writeText).toHaveBeenCalledWith('public-example');
  expect(host.textContent).toContain('Đã sao chép');
});
it('shows a loading state while the server response is pending', async () => {
  api.getPushConfig.mockReturnValue(new Promise(() => {}));
  await render(); expect(host.textContent).toContain('Đang kiểm tra');
});
it('offers manual copying if clipboard access fails', async () => {
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } });
  api.getPushConfig.mockResolvedValue({ configured: true, publicKey: 'public-example' });
  await render();
  await act(async () => { host.querySelector('button')!.click(); });
  expect(host.textContent).toContain('sao chép khóa thủ công');
});
it('shows unavailable without a key', async () => {
  api.getPushConfig.mockResolvedValue({ configured: false, publicKey: null });
  await render(); expect(host.textContent).toContain('chưa sẵn sàng'); expect(host.querySelector('button')).toBeNull();
});
it('shows error and allows retry', async () => {
  api.getPushConfig.mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ configured: true, publicKey: 'retried-key' });
  await render(); expect(host.textContent).toContain('Không tải được');
  await act(async () => { host.querySelector('button')!.click(); await new Promise(resolve => setTimeout(resolve, 20)); });
  expect(host.textContent).toContain('retried-key');
});
