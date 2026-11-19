/* Deliberately no payload text, account data, credentials, or arbitrary click URL. */
const CACHE = 'jozo-shift-push-v1';
const STATE = '/__jozo_shift_push_owner__';
const PENDING = '/__jozo_shift_push_pending__';
const LOCK = 'jozo-shift-push';
async function allowed() {
  try {
    const response = await (await caches.open(CACHE)).match(STATE);
    const state = response && await response.json();
    const sub = await self.registration.pushManager.getSubscription();
    return state && state.owner && state.session && state.scope === self.registration.scope && state.endpoint === sub?.endpoint;
  } catch { return false; }
}
// Persist only the initiating client/request binding, never the nonce or bearer.
self.addEventListener('message', event => {
  const data = event.data, source = event.source;
  if (data?.type !== 'shift-push-arm-v1' || !/^[\w-]{43}$/.test(data.requestId) || !source?.id || !event.ports?.[0] || !self.navigator.locks) return;
  event.waitUntil(self.navigator.locks.request(LOCK, async () => {
    const client = await self.clients.get(source.id);
    const sub = await self.registration.pushManager.getSubscription();
    if (!client || client.type !== 'window' || new URL(client.url).origin !== self.location.origin || sub?.endpoint !== data.endpoint) return;
    await (await caches.open(CACHE)).put(PENDING, new Response(JSON.stringify({ clientId: source.id, requestId: data.requestId, endpoint: sub.endpoint, scope: self.registration.scope, expiresAt: Date.now() + 60000 })));
    event.ports[0].postMessage({ requestId: data.requestId, endpoint: sub.endpoint });
  }));
});
async function possession(data) {
  if (data?.type !== 'shift-push-possession-v1') return false;
  // Safari requires a visible notification for every challenge, even with no page open.
  // Never put the nonce or payload contents in notification text/data.
  await self.registration.showNotification('Jozo — Xác minh thông báo', {
    body: 'Yêu cầu xác minh thông báo trên thiết bị.', tag: 'jozo-shift-push-verification',
  });
  if (!/^[\w-]{43}$/.test(data.requestId) || !/^[\w-]{43}$/.test(data.nonce) || !Number.isFinite(data.expiresAt) || data.expiresAt <= Date.now() || data.expiresAt > Date.now() + 60000) return true;
  const cache = await caches.open(CACHE), response = await cache.match(PENDING);
  const pending = response && await response.json();
  const sub = await self.registration.pushManager.getSubscription();
  if (!pending || pending.expiresAt <= Date.now() || pending.requestId !== data.requestId || pending.scope !== self.registration.scope || pending.endpoint !== sub?.endpoint) return true;
  const client = await self.clients.get(pending.clientId);
  await cache.delete(PENDING); // One delivery, never broadcast to other windows.
  if (client?.type === 'window' && new URL(client.url).origin === self.location.origin) client.postMessage({ ...data, endpoint: sub.endpoint });
  return true;
}
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('push', event => {
  event.waitUntil((async () => {
    if (!self.navigator.locks) return;
    await self.navigator.locks.request(LOCK, async () => {
      let data;
      try { data = event.data?.json(); } catch { return; }
      if (await possession(data)) return;
      if (!await allowed()) return;
      if (data?.type === 'manual-notification-v1') {
        await self.registration.showNotification('Jozo — Thông báo mới', {
          body: 'Mở Jozo để xem thông báo.', tag: 'jozo-manual-notification',
        });
      } else if (data?.type === 'operation-notification-v1') {
        await self.registration.showNotification('Jozo — Yêu cầu vận hành', {
          body: 'Mở Jozo để kiểm tra yêu cầu hỗ trợ hoặc đơn hàng.', tag: 'jozo-operation-notification',
        });
      } else {
        await self.registration.showNotification('Jozo — Nhắc đăng ký ca', {
          body: 'Mở Lịch của tôi để kiểm tra đăng ký ca.', tag: 'jozo-shift-reminder',
        });
      }
    });
  })());
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.notification.tag === 'jozo-shift-push-verification') return;
  event.waitUntil((async () => {
    if (!self.navigator.locks) return;
    await self.navigator.locks.request(LOCK, async () => {
      if (!await allowed()) return;
      const path = event.notification.tag === 'jozo-manual-notification' ? '/notifications'
        : event.notification.tag === 'jozo-operation-notification' ? '/' : '/my-schedule';
      const url = new URL(path, self.location.origin).href;
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const existing = windows.find(client => new URL(client.url).origin === self.location.origin);
      if (existing) { const navigated = await existing.navigate(url); await navigated?.focus(); }
      else await self.clients.openWindow(url);
    });
  })());
});
