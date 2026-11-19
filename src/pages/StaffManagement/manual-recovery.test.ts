// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import ManualNotification from './ManualNotification';
import { AuthContext } from '@/context/Authorization.context';
const http = vi.hoisted(() => ({ post: vi.fn(), get: vi.fn() }));
vi.mock('@/utils/http', () => ({ default: http }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const storage = new Map<string, string>();
Object.defineProperty(window, 'localStorage', { value: { getItem: (k: string) => storage.get(k) ?? null, setItem: (k: string, v: string) => storage.set(k, v), removeItem: (k: string) => storage.delete(k), clear: () => storage.clear() }, configurable: true });
let root: Root;
afterEach(() => { if (root) act(() => root.unmount()); window.localStorage.clear(); document.body.innerHTML = ''; vi.resetAllMocks(); });
it('recovers the owner request after reload without posting again', async () => {
  window.localStorage.setItem('manual-notification:admin1', JSON.stringify({ requestId: '3cd7266c-695b-47b7-9c9f-2453683d2999', recipients: [{ id: 'a', name: 'An' }], title: 'Hi', body: 'Hello' }));
  http.get.mockResolvedValue({ data: { results: [{ userId: 'a', status: 'created', push: 'unavailable' }] } });
  const host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  await act(async () => root.render(createElement(AuthContext.Provider, { value: { user: { _id: 'admin1' } as any, isAuthenticated: true, isLoading: false } }, createElement(ManualNotification, { selected: [], onRemove: vi.fn() }))));
  expect(http.get).toHaveBeenCalledWith('/notifications/manual/3cd7266c-695b-47b7-9c9f-2453683d2999');
  expect(host.textContent).toContain('Đã tạo trong ứng dụng');
  expect(host.textContent).not.toContain('3cd7266c-695b-47b7-9c9f-2453683d2999');
  expect(host.textContent).not.toContain('Mã yêu cầu');
  expect(http.post).not.toHaveBeenCalled();
});
