import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const requestId = 'a'.repeat(43), nonce = 'b'.repeat(43), endpoint = 'https://web.push.apple.com/token';
function fixture() {
  const handlers: Record<string, (event: any) => void> = {}, cached = new Map<string, Response>();
  const target = { id: 'initiator', type: 'window', url: 'https://jozo.test/my-schedule', postMessage: vi.fn() };
  const other = { ...target, id: 'other', postMessage: vi.fn() };
  const showNotification = vi.fn().mockResolvedValue(undefined);
  const self = {
    addEventListener: (type: string, handler: any) => { handlers[type] = handler; },
    navigator: { locks: { request: async (_: string, work: () => any) => work() } },
    location: { origin: 'https://jozo.test' },
    registration: { scope: 'https://jozo.test/shift-push/unique/', showNotification, pushManager: { getSubscription: async () => ({ endpoint }) } },
    clients: { get: vi.fn(async (id: string) => id === target.id ? target : other), matchAll: vi.fn(async () => [target, other]) },
  };
  const cache = { match: async (key: string) => cached.get(key)?.clone(), put: async (key: string, value: Response) => { cached.set(key, value); }, delete: async (key: string) => cached.delete(key) };
  runInNewContext(readFileSync('public/shift-reminder-sw.js', 'utf8'), { self, caches: { open: async () => cache }, URL, Response });
  const dispatch = async (type: string, event: any) => { let work: Promise<any> | undefined; handlers[type]({ ...event, waitUntil: (p: Promise<any>) => { work = p; } }); await work; };
  const ack = vi.fn();
  const arm = () => dispatch('message', { source: { id: target.id }, ports: [{ postMessage: ack }], data: { type: 'shift-push-arm-v1', requestId, endpoint } });
  const push = (data = {}) => dispatch('push', { data: { json: () => ({ type: 'shift-push-possession-v1', requestId, nonce, expiresAt: Date.now() + 50000, ...data }) } });
  return { target, other, self, cached, arm, push, ack, showNotification };
}
describe('possession worker', () => {
  it('shows a generic notification before delivering only to the initiating client, once', async () => {
    const f = fixture(); await f.arm();
    expect(f.ack).toHaveBeenCalledWith({ requestId, endpoint });
    await f.push(); await f.push();
    expect(f.target.postMessage).toHaveBeenCalledTimes(1);
    expect(f.other.postMessage).not.toHaveBeenCalled();
    expect(f.self.clients.matchAll).not.toHaveBeenCalled();
    expect(f.target.postMessage).toHaveBeenCalledWith(expect.objectContaining({ requestId, nonce, endpoint }));
    expect(f.showNotification.mock.invocationCallOrder[0]).toBeLessThan(f.target.postMessage.mock.invocationCallOrder[0]);
    expect(JSON.stringify(f.showNotification.mock.calls)).not.toContain(nonce);
    expect(JSON.stringify([...f.cached.values()])).not.toContain(nonce);
  });
  it('shows visible challenge even without an initiating page, but never sends proof', async () => {
    const f = fixture(); await f.push();
    expect(f.showNotification).toHaveBeenCalledTimes(1);
    expect(f.target.postMessage).not.toHaveBeenCalled();
  });
  it('rejects wrong request, expired challenge, retired scope and removed pending binding', async () => {
    const f = fixture(); await f.arm();
    await f.push({ requestId: 'c'.repeat(43) }); await f.push({ expiresAt: Date.now() - 1 });
    f.self.registration.scope = 'https://jozo.test/shift-push/retired/'; await f.push();
    f.cached.clear(); await f.push();
    expect(f.target.postMessage).not.toHaveBeenCalled();
  });
  it('does not send nonce when visible notification fails', async () => {
    const f = fixture(); await f.arm(); f.showNotification.mockRejectedValueOnce(new Error('denied'));
    await expect(f.push()).rejects.toThrow('denied');
    expect(f.target.postMessage).not.toHaveBeenCalled();
  });
});
