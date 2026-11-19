import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

function worker({ owned = true, existing = true, locks = true } = {}) {
  const handlers: Record<string, (event: any) => void> = {};
  const endpoint = 'endpoint';
  const showNotification = vi.fn(async () => {});
  const focus = vi.fn(async () => {});
  const navigate = vi.fn(async () => ({ focus }));
  const openWindow = vi.fn(async () => {});
  const self = {
    addEventListener: (type: string, handler: any) => { handlers[type] = handler; },
    navigator: { locks: locks ? { request: async (_: string, work: () => any) => work() } : undefined },
    location: { origin: 'https://jozo.test' },
    registration: { scope: 'https://jozo.test/push/', showNotification, pushManager: { getSubscription: async () => ({ endpoint }) } },
    clients: { matchAll: vi.fn(async () => existing ? [{ url: 'https://jozo.test/other', navigate }] : []), openWindow },
  };
  let state: any = owned ? { owner: 'owner', session: 'session', endpoint, scope: self.registration.scope } : null;
  const cache = { match: async () => state && new Response(JSON.stringify(state)) };
  runInNewContext(readFileSync('public/shift-reminder-sw.js', 'utf8'), { self, caches: { open: async () => cache }, URL, Response });
  const dispatch = async (type: string, event: any) => {
    let pending: Promise<any> | undefined;
    handlers[type]({ ...event, waitUntil: (p: Promise<any>) => { pending = p; } });
    await pending;
  };
  const push = () => dispatch('push', { data: { json: () => ({ type: 'operation-notification-v1', title: 'PRIVATE', body: 'PRIVATE', url: 'https://evil.test/' }) } });
  const click = () => dispatch('notificationclick', { notification: { tag: 'jozo-operation-notification', data: { url: 'https://evil.test/' }, close: vi.fn() } });
  return { push, click, showNotification, navigate, focus, openWindow, setState: (value: any) => { state = value; } };
}

describe('operations notification worker', () => {
  it('shows generic support/order copy without payload data and navigates to the room timeline', async () => {
    const w = worker();
    await w.push();
    expect(w.showNotification).toHaveBeenCalledWith('Jozo — Yêu cầu vận hành', {
      body: 'Mở Jozo để kiểm tra yêu cầu hỗ trợ hoặc đơn hàng.', tag: 'jozo-operation-notification',
    });
    expect(JSON.stringify(w.showNotification.mock.calls)).not.toContain('PRIVATE');
    await w.click();
    expect(w.navigate).toHaveBeenCalledWith('https://jozo.test/');
    expect(w.focus).toHaveBeenCalledOnce();
  });

  it('opens the fixed room timeline when no window exists', async () => {
    const w = worker({ existing: false });
    await w.click();
    expect(w.openWindow).toHaveBeenCalledWith('https://jozo.test/');
  });

  it('does not display or navigate without ownership, and rejects a stale click after logout', async () => {
    const w = worker({ owned: false });
    await w.push(); await w.click();
    expect(w.showNotification).not.toHaveBeenCalled();
    expect(w.navigate).not.toHaveBeenCalled();
    const owned = worker();
    await owned.push();
    owned.setState(null);
    await owned.click();
    expect(owned.navigate).not.toHaveBeenCalled();
    expect(owned.openWindow).not.toHaveBeenCalled();
  });

  it('does not display or navigate without the session lock', async () => {
    const w = worker({ locks: false });
    await w.push(); await w.click();
    expect(w.showNotification).not.toHaveBeenCalled();
    expect(w.navigate).not.toHaveBeenCalled();
    expect(w.openWindow).not.toHaveBeenCalled();
  });
});
