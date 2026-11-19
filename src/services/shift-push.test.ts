import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { createProof, disablePush, enablePush, getPushConfig, pushEnabled, pushSupport, suppressPush } from './shift-push';

const http = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), post: vi.fn(), delete: vi.fn() }));
vi.mock('@/utils/http', () => ({ default: http }));
let receiver: (event: unknown) => void;
const storage = new Map<string, string>();
const cached = new Map<string, Response>();
const close = vi.fn();
const unsubscribe = vi.fn();
const subscribe = vi.fn();
const requestPermission = vi.fn();
const registration = {
  scope: 'https://jozo.test/shift-push/test/',
  active: { scriptURL: 'https://jozo.test/shift-reminder-sw.js', postMessage: vi.fn((data, ports) => ports[0].postMessage(data)) },
  unregister: vi.fn(async () => true),
  getNotifications: vi.fn(async () => [{ close }]),
  pushManager: { getSubscription: vi.fn(), subscribe },
};
const subscription = (endpoint: string) => ({ endpoint, unsubscribe, toJSON: () => ({ keys: { p256dh: 'public-key', auth: 'auth-key' } }) });
const cache = { match: vi.fn(async (key: string) => cached.get(key)?.clone()), delete: vi.fn(async (key: string) => cached.delete(key)), put: vi.fn(async (key: string, value: Response) => { cached.set(key, value); }) };
beforeEach(() => {
  vi.clearAllMocks(); storage.clear(); cached.clear();
  storage.set('access_token', 'session-a');
  vi.stubGlobal('crypto', webcrypto);
  vi.stubGlobal('window', globalThis);
  vi.stubGlobal('isSecureContext', true);
  vi.stubGlobal('location', { origin: 'https://jozo.test' });
  vi.stubGlobal('localStorage', { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) });
  vi.stubGlobal('caches', { open: async () => cache });
  vi.stubGlobal('PushManager', class {});
  vi.stubGlobal('Notification', { permission: 'granted', requestPermission });
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
  vi.stubGlobal('navigator', {
    userAgent: 'test', platform: 'test', maxTouchPoints: 0,
    locks: { request: async (_name: string, fn: () => Promise<unknown>) => fn() },
    serviceWorker: { addEventListener: vi.fn((_type, fn) => { receiver = fn; }), removeEventListener: vi.fn(), register: vi.fn(async () => registration), getRegistration: vi.fn(async () => registration), getRegistrations: vi.fn(async () => [registration]) },
  });
  registration.pushManager.getSubscription.mockResolvedValue(null);
  subscribe.mockResolvedValue(subscription('https://push.test/new'));
  unsubscribe.mockResolvedValue(true);
  requestPermission.mockResolvedValue('granted');
  http.put.mockResolvedValue({}); http.delete.mockResolvedValue({});
  http.post.mockImplementation(async (path, body) => {
    if (path.endsWith('/challenge')) {
      registration.pushManager.getSubscription.mockResolvedValue(subscription(body.subscription.endpoint));
      receiver({ source: registration.active, origin: location.origin, data: { type: 'shift-push-possession-v1', requestId: body.requestId, endpoint: body.subscription.endpoint, nonce: createProof(), expiresAt: Date.now() + 60000 } });
    }
    return {};
  });
});
afterEach(() => vi.unstubAllGlobals());

describe('personal push', () => {
  it('generates 32 random bytes as unpadded base64url', () => {
    const proof = createProof();
    expect(proof).toMatch(/^[\w-]{43}$/);
    expect(Buffer.from(proof, 'base64url')).toHaveLength(32);
    expect(createProof()).not.toBe(proof);
  });
  it('GET is read only; opt-in persists proof and confirms a worker receipt before enabling', async () => {
    http.get.mockResolvedValue({ data: { configured: true, publicKey: 'vapid' } });
    expect(await getPushConfig()).toEqual({ configured: true, publicKey: 'vapid' });
    expect(requestPermission).not.toHaveBeenCalled();
    await enablePush('account-a', 'vapid');
    expect(http.put).not.toHaveBeenCalled();
    expect(http.post).toHaveBeenNthCalledWith(2, '/shift-reminders/me/push/confirm', expect.objectContaining({ endpoint: 'https://push.test/new', nonce: expect.stringMatching(/^[\w-]{43}$/) }), { headers: { Authorization: 'Bearer session-a' } });
    registration.pushManager.getSubscription.mockResolvedValue(subscription('https://push.test/new'));
    expect(await pushEnabled('account-a')).toBe(true);
    expect(await pushEnabled('account-b')).toBe(false);
    const gate = await [...cached.values()][0].clone().text();
    expect(gate).not.toContain('session-a');
    expect(gate).not.toContain(JSON.parse(storage.get('jozo.shiftPush.record')!).proof);
  });
  it('denial does not subscribe or PUT', async () => {
    requestPermission.mockResolvedValue('denied');
    await expect(enablePush('a', 'vapid')).rejects.toThrow();
    expect(subscribe).not.toHaveBeenCalled(); expect(http.put).not.toHaveBeenCalled();
  });
  it('failed challenge keeps proof and leaves worker suppressed', async () => {
    http.post.mockRejectedValue(new Error('offline'));
    await expect(enablePush('a', 'vapid')).rejects.toThrow();
    expect(storage.has('jozo.shiftPush.record')).toBe(true); expect(cached.size).toBe(0);
  });
  it('clears ownership and visible notifications before authenticated DELETE, even when offline', async () => {
    await enablePush('a', 'vapid');
    const record = JSON.parse(storage.get('jozo.shiftPush.record')!);
    http.delete.mockImplementation(async () => { expect(cached.size).toBe(0); expect(close).toHaveBeenCalled(); expect(storage.get('access_token')).toBe('session-a'); throw new Error('offline'); });
    expect(await disablePush()).toBe(false);
    expect(http.delete).toHaveBeenCalledWith('/shift-reminders/me/push', { data: { endpoint: record.endpoint, proof: record.proof }, headers: { Authorization: 'Bearer session-a' } });
    expect(JSON.parse(storage.get('jozo.shiftPush.record')!).proof).toBe(record.proof);
  });
  it('logout during confirmation cannot restore ownership', async () => {
    const send = http.post.getMockImplementation()!;
    http.post.mockImplementation(async (path, body) => { if (path.endsWith('/confirm')) await suppressPush(true); else return send(path, body); });
    await expect(enablePush('a', 'vapid')).rejects.toThrow('Phiên');
    expect(cached.size).toBe(0);
    await expect(enablePush('a', 'vapid')).rejects.toThrow('đăng nhập');
  });
  it('account change during permission request cancels opt-in', async () => {
    requestPermission.mockImplementation(async () => { storage.set('access_token', 'session-b'); return 'granted'; });
    await expect(enablePush('a', 'vapid')).rejects.toThrow('Phiên');
    expect(http.put).not.toHaveBeenCalled();
  });
  it('refuses reassignment when unsubscribe fails or endpoint does not rotate', async () => {
    await enablePush('a', 'vapid'); await suppressPush();
    registration.pushManager.getSubscription.mockResolvedValue(subscription('https://push.test/new'));
    http.put.mockClear(); unsubscribe.mockResolvedValue(false);
    await expect(enablePush('b', 'vapid')).rejects.toThrow();
    unsubscribe.mockResolvedValue(true);
    await expect(enablePush('b', 'vapid')).rejects.toThrow();
    expect(http.put).not.toHaveBeenCalled(); expect(cached.size).toBe(0);
  });
  it('ignores forged worker, origin, endpoint and request receipts before accepting the bound worker', async () => {
    http.post.mockImplementation(async (path, body) => {
      if (!path.endsWith('/challenge')) return {};
      registration.pushManager.getSubscription.mockResolvedValue(subscription(body.subscription.endpoint));
      const event = { source: registration.active, origin: location.origin, data: { type: 'shift-push-possession-v1', requestId: body.requestId, endpoint: body.subscription.endpoint, nonce: createProof(), expiresAt: Date.now() + 50000 } };
      receiver({ ...event, source: {} });
      receiver({ ...event, origin: 'https://evil.test' });
      receiver({ ...event, data: { ...event.data, endpoint: 'wrong' } });
      receiver({ ...event, data: { ...event.data, requestId: createProof() } });
      expect(http.post).toHaveBeenCalledTimes(1);
      receiver(event);
      return {};
    });
    await enablePush('a', 'vapid');
    expect(http.post).toHaveBeenCalledTimes(2);
  });
  it('overlapping permission requests retire the earlier attempt', async () => {
    let grant: (permission: string) => void = () => {};
    requestPermission.mockImplementationOnce(() => new Promise(resolve => { grant = resolve; }));
    const first = enablePush('a', 'vapid');
    await enablePush('a', 'vapid');
    grant('granted');
    await expect(first).rejects.toThrow('Phiên');
    expect(http.post).toHaveBeenCalledTimes(2);
  });
  it('reports HTTPS, iOS Home Screen, and missing capability requirements', () => {
    vi.stubGlobal('isSecureContext', false); expect(pushSupport()).toContain('HTTPS');
    vi.stubGlobal('isSecureContext', true);
    Object.assign(navigator, { userAgent: 'iPhone' }); expect(pushSupport()).toContain('Màn hình chính');
    Object.assign(navigator, { userAgent: 'test', locks: undefined }); expect(pushSupport()).toContain('chưa hỗ trợ');
  });
});

describe('worker privacy and routing', () => {
  async function worker(enabled: boolean, existing = true) {
    const handlers: { [key: string]: (event: unknown) => void } = {};
    const showNotification = vi.fn(); const focus = vi.fn();
    const navigate = vi.fn(async () => ({ focus })); const openWindow = vi.fn();
    const self = {
      addEventListener: (name: string, fn: (event: unknown) => void) => { handlers[name] = fn; },
      navigator: { locks: navigator.locks }, location: { origin: 'https://jozo.test' },
      registration: { scope: 'https://jozo.test/shift-push/test/', showNotification, pushManager: { getSubscription: async () => ({ endpoint: 'endpoint' }) } },
      clients: { matchAll: async () => existing ? [{ url: 'https://jozo.test/admin', navigate }] : [], openWindow },
    };
    if (enabled) cached.set('/__jozo_shift_push_owner__', new Response(JSON.stringify({ owner: 'a', scope: 'https://jozo.test/shift-push/test/', session: 'digest', endpoint: 'endpoint' })));
    runInNewContext(readFileSync('public/shift-reminder-sw.js', 'utf8'), { self, caches, URL });
    const dispatch = async (name: string) => {
      let task: Promise<void> | undefined;
      handlers[name]({ data: { json: () => ({ title: 'SECRET', url: 'https://evil.test' }) }, notification: { close }, waitUntil: (p: Promise<void>) => { task = p; } });
      await task;
    };
    return { dispatch, showNotification, navigate, focus, openWindow };
  }
  it('drops unowned pushes and stale clicks', async () => {
    const w = await worker(false); await w.dispatch('push'); await w.dispatch('notificationclick');
    expect(w.showNotification).not.toHaveBeenCalled(); expect(w.openWindow).not.toHaveBeenCalled(); expect(w.navigate).not.toHaveBeenCalled();
  });
  it('ignores payload secrets and URLs, navigates and focuses My Schedule', async () => {
    const w = await worker(true); await w.dispatch('push'); await w.dispatch('notificationclick');
    expect(JSON.stringify(w.showNotification.mock.calls)).not.toContain('SECRET');
    expect(w.showNotification.mock.calls[0][1]).not.toHaveProperty('data');
    expect(w.navigate).toHaveBeenCalledWith('https://jozo.test/my-schedule'); expect(w.focus).toHaveBeenCalled();
  });
  it('rejects queued events from a retired worker scope', async () => {
    const w = await worker(true);
    cached.set('/__jozo_shift_push_owner__', new Response(JSON.stringify({ owner: 'b', session: 'digest', endpoint: 'endpoint', scope: 'https://jozo.test/shift-push/new/' })));
    await w.dispatch('push');
    expect(w.showNotification).not.toHaveBeenCalled();
  });
  it('opens My Schedule when no window exists', async () => {
    const w = await worker(true, false); await w.dispatch('notificationclick');
    expect(w.openWindow).toHaveBeenCalledWith('https://jozo.test/my-schedule');
  });
});
