import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

describe('manual notification push worker', () => {
  it('uses generic text and opens notifications, without exposing the payload', async () => {
    const handlers: Record<string, (event: any) => void> = {};
    const endpoint = 'https://fcm.googleapis.com/fcm/send/test';
    const showNotification = vi.fn(async () => {});
    const navigate = vi.fn(async () => ({ focus: vi.fn() }));
    const self = {
      addEventListener: (type: string, handler: any) => { handlers[type] = handler; },
      navigator: { locks: { request: async (_: string, work: () => any) => work() } },
      location: { origin: 'https://jozo.test' },
      registration: { scope: 'https://jozo.test/push/', showNotification, pushManager: { getSubscription: async () => ({ endpoint }) } },
      clients: { matchAll: vi.fn(async () => [{ url: 'https://jozo.test/', navigate }]) },
    };
    const state = { owner: 'user', session: 'session', scope: self.registration.scope, endpoint };
    const cache = { match: async () => new Response(JSON.stringify(state)) };
    runInNewContext(readFileSync('public/shift-reminder-sw.js', 'utf8'), { self, caches: { open: async () => cache }, URL, Response });
    const dispatch = async (type: string, event: any) => { let pending: Promise<any> | undefined; handlers[type]({ ...event, waitUntil: (p: Promise<any>) => { pending = p; } }); await pending; };
    await dispatch('push', { data: { json: () => ({ type: 'manual-notification-v1', title: 'private', body: 'secret' }) } });
    expect(showNotification).toHaveBeenCalledWith('Jozo — Thông báo mới', expect.objectContaining({ tag: 'jozo-manual-notification' }));
    expect(JSON.stringify(showNotification.mock.calls)).not.toContain('secret');
    await dispatch('notificationclick', { notification: { tag: 'jozo-manual-notification', close: vi.fn() } });
    expect(navigate).toHaveBeenCalledWith('https://jozo.test/notifications');
  });
});
