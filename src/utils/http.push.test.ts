import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { AxiosError } from 'axios';
const mocks = vi.hoisted(() => ({ suppressPush: vi.fn(), toast: vi.fn() }));
vi.mock('@/services/shift-push', () => ({ suppressPush: mocks.suppressPush }));
vi.mock('@/hooks/use-toast', () => ({ toast: mocks.toast }));
const storage = new Map<string, string>();
const replace = vi.fn();
beforeEach(() => {
  vi.resetModules(); vi.resetAllMocks(); storage.clear(); storage.set('access_token', 'token-a');
  vi.stubGlobal('localStorage', { getItem: (key: string) => storage.get(key) ?? null, removeItem: (key: string) => storage.delete(key) });
  vi.stubGlobal('window', { location: { pathname: '/my-schedule', replace }, dispatchEvent: vi.fn() });
});
afterEach(() => vi.unstubAllGlobals());
async function unauthorized(beforeResponse?: () => void) {
  const { default: http } = await import('./http');
  await http.get('/private', { adapter: async config => {
    beforeResponse?.();
    throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, undefined, { status: 401, statusText: 'Unauthorized', headers: {}, data: {}, config });
  } }).catch(() => undefined);
  await new Promise(resolve => setTimeout(resolve, 0));
}
it('401 suppresses before removing credentials and redirecting', async () => {
  mocks.suppressPush.mockImplementation(async () => { expect(storage.get('access_token')).toBe('token-a'); expect(replace).not.toHaveBeenCalled(); });
  await unauthorized();
  expect(mocks.suppressPush).toHaveBeenCalledWith(true); expect(storage.has('access_token')).toBe(false); expect(replace).toHaveBeenCalledWith('/login');
});
it('a stale-token 401 cannot log out a new account', async () => {
  await unauthorized(() => storage.set('access_token', 'token-b'));
  expect(mocks.suppressPush).not.toHaveBeenCalled(); expect(storage.get('access_token')).toBe('token-b'); expect(replace).not.toHaveBeenCalled();
});
it('does not redirect when local suppression fails', async () => {
  mocks.suppressPush.mockRejectedValue(new Error('storage unavailable')); await unauthorized();
  expect(storage.get('access_token')).toBe('token-a'); expect(replace).not.toHaveBeenCalled(); expect(mocks.toast).toHaveBeenCalled();
});
