// Proof stays in page storage; the worker receives only a non-secret ownership gate.
const CACHE = 'jozo-shift-push-v1';
const STATE = '/__jozo_shift_push_owner__';
const PENDING = '/__jozo_shift_push_pending__';
const RECORD = 'jozo.shiftPush.record';
const EPOCH = 'jozo.shiftPush.epoch';
const LOCK = 'jozo-shift-push';
type Record = { owner: string; endpoint: string; proof: string; scope: string };
type Gate = { owner: string; endpoint: string; session: string; scope: string };
const token = () => localStorage.getItem('access_token');
const epoch = () => localStorage.getItem(EPOCH);
const lock = <T>(work: () => Promise<T>) => navigator.locks.request(LOCK, work);
export class PushSetupError extends Error {}
const setupMessages = new Set([
  'Vui lòng đăng nhập lại.', 'Chưa được cấp quyền thông báo. Kiểm tra cài đặt trình duyệt.',
  'Phiên đã thay đổi. Vui lòng thử lại.', 'Không thể khởi động thông báo.',
  'Khởi động thông báo quá lâu. Thử lại.', 'Không thể xóa đăng ký cũ. Hãy thử lại.',
  'Không thể tạo đăng ký riêng cho tài khoản này.', 'Đăng ký cũ chưa được thay thế.',
  'Đăng ký thông báo không hợp lệ.',
]);
async function setupStep<T>(step: string, work: () => Promise<T>): Promise<T> {
  try { return await work(); } catch (error) {
    if (error instanceof PushSetupError) throw error;
    const name = error instanceof Error || error instanceof DOMException ? error.name : '';
    const browserMessages = new Map([
      ['NotAllowedError', 'Trình duyệt không cho phép thao tác; kiểm tra quyền thông báo.'],
      ['AbortError', 'Trình duyệt đã hủy thao tác; hãy thử lại.'],
      ['InvalidStateError', 'Trạng thái trình duyệt chưa phù hợp; hãy thử tải lại trang.'],
      ['SecurityError', 'Trình duyệt chặn thao tác vì chính sách bảo mật.'],
      ['TypeError', 'Trình duyệt không chấp nhận dữ liệu hoặc tùy chọn đăng ký.'],
    ]);
    const detail = error instanceof Error && setupMessages.has(error.message) ? error.message : browserMessages.get(name) || 'Trình duyệt không hoàn tất bước này. Hãy thử lại.';
    throw new PushSetupError(`${step}: ${detail}`);
  }
}
export function pushSupport(): string | null {
  if (!window.isSecureContext) return 'Thông báo cần HTTPS (hoặc localhost khi phát triển).';
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (ios && !window.matchMedia('(display-mode: standalone)').matches && !(navigator as Navigator & { standalone?: boolean }).standalone)
    return 'Trên iOS/iPadOS 16.4+, thêm Jozo vào Màn hình chính rồi mở từ biểu tượng đó.';
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window) || !navigator.locks || !('caches' in window))
    return 'Trình duyệt này chưa hỗ trợ đầy đủ thông báo an toàn. Hãy dùng trình duyệt mới hơn.';
  return null;
}
export function createProof() {
  return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function readPushRecord(): Record | null {
  try { const r = JSON.parse(localStorage.getItem(RECORD) || 'null'); return r && typeof r.owner === 'string' && typeof r.endpoint === 'string' && typeof r.scope === 'string' && r.scope.startsWith('/shift-push/') && /^[\w-]{43}$/.test(r.proof) ? r : null; } catch { return null; }
}
async function session() {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token() || ''))), b => b.toString(16).padStart(2, '0')).join('');
}
async function gate(): Promise<Gate | null> {
  const response = await (await caches.open(CACHE)).match(STATE);
  return response ? response.json() : null;
}
async function registration() {
  const scope = readPushRecord()?.scope;
  if (!scope) return undefined;
  const r = await navigator.serviceWorker.getRegistration(scope);
  return r?.active?.scriptURL === new URL('/shift-reminder-sw.js', location.origin).href ? r : undefined;
}
// Invalidates pending opt-ins immediately, including those in another tab.
export async function suppressPush(blockSession = false) {
  if (blockSession) localStorage.setItem('jozo.shiftPush.blocked', '1');
  localStorage.setItem(EPOCH, createProof());
  if (!('caches' in window)) return;
  const clear = async () => {
    await (await caches.open(CACHE)).delete(STATE);
    await (await caches.open(CACHE)).delete(PENDING);
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const r of registrations) {
        if (r.active?.scriptURL !== new URL('/shift-reminder-sw.js', location.origin).href) continue;
        for (const n of await r.getNotifications()) n.close();
      }
    }
  };
  if (navigator.locks) await lock(clear); else await clear();
}
export async function reconcilePush(owner: string | null) {
  if (!('caches' in window)) return;
  const g = await gate();
  if (g && (!token() || g.owner !== owner || g.session !== await session())) await suppressPush();
}
export async function pushEnabled(owner: string) {
  if (pushSupport() || Notification.permission !== 'granted') return false;
  const g = await gate();
  const sub = await (await registration())?.pushManager.getSubscription();
  return !!g && g.owner === owner && g.session === await session() && g.endpoint === sub?.endpoint;
}
export async function disablePush() {
  const record = readPushRecord(), authToken = token();
  const suppression = suppressPush(); // Retire the current epoch synchronously.
  const retiredEpoch = epoch();
  await suppression;
  let revoked = true;
  try {
    if ('serviceWorker' in navigator && navigator.locks) await lock(async () => {
      if (token() !== authToken || epoch() !== retiredEpoch) { revoked = false; return; }
      for (const r of await navigator.serviceWorker.getRegistrations()) {
        if (token() !== authToken || epoch() !== retiredEpoch) { revoked = false; return; }
        if (r.active?.scriptURL !== new URL('/shift-reminder-sw.js', location.origin).href) continue;
        const sub = await r.pushManager.getSubscription();
        if (token() !== authToken || epoch() !== retiredEpoch) { revoked = false; return; }
        if (sub && !await sub.unsubscribe()) { revoked = false; continue; }
        if (token() !== authToken || epoch() !== retiredEpoch) { revoked = false; return; }
        await r.unregister();
      }
    });
  } catch { revoked = false; }
  if (record && authToken) {
    try {
      const { default: http } = await import('@/utils/http');
      await http.delete('/shift-reminders/me/push', { data: { endpoint: record.endpoint, proof: record.proof }, headers: { Authorization: `Bearer ${authToken}` } });
    } catch { revoked = false; }
  }
  // Keep proof after failures/uncertain responses; never reassign an endpoint without it.
  return revoked;
}
export async function getPushConfig() {
  const { default: http } = await import('@/utils/http');
  return (await http.get<{ configured: boolean; publicKey: string }>('/shift-reminders/me/push')).data;
}
export async function enablePush(owner: string, publicKey: string) {
  const unsupported = pushSupport();
  if (unsupported) throw new Error(unsupported);
  const initialToken = token();
  // Every attempt retires earlier attempts, including those in other tabs.
  localStorage.setItem(EPOCH, createProof());
  const initialEpoch = epoch();
  if (!initialToken || localStorage.getItem('jozo.shiftPush.blocked')) throw new PushSetupError('Vui lòng đăng nhập lại.');
  // Called directly from a button, before any asynchronous work (iOS user activation).
  const permission = await setupStep('Xin quyền thông báo', () => Notification.requestPermission());
  if (permission !== 'granted') throw new PushSetupError('Chưa được cấp quyền thông báo. Kiểm tra cài đặt trình duyệt.');
  const check = () => { if (token() !== initialToken || epoch() !== initialEpoch || localStorage.getItem('jozo.shiftPush.blocked')) throw new PushSetupError('Phiên đã thay đổi. Vui lòng thử lại.'); };
  check();
  const currentGate = await setupStep('Đọc trạng thái trên thiết bị', () => gate());
  const previousRecord = readPushRecord();
  if (currentGate && (currentGate.owner !== owner || currentGate.session !== await session())) {
    await suppressPush();
    throw new PushSetupError('Phiên đã thay đổi. Vui lòng thử lại.');
  }
  const scope = currentGate?.owner === owner && previousRecord?.owner === owner
    ? previousRecord.scope : `/shift-push/${createProof()}/`;
  const r = await setupStep('Đăng ký service worker', () => navigator.serviceWorker.register('/shift-reminder-sw.js', { scope }));
  if (!r.active) await setupStep('Kích hoạt service worker', () => new Promise<void>((resolve, reject) => {
    const worker = r.installing || r.waiting;
    if (!worker) return reject(new Error('Không thể khởi động thông báo.'));
    const timer = setTimeout(() => reject(new Error('Khởi động thông báo quá lâu. Thử lại.')), 10000);
    worker.addEventListener('statechange', () => { if (worker.state === 'activated') { clearTimeout(timer); resolve(); } if (worker.state === 'redundant') { clearTimeout(timer); reject(new Error('Không thể khởi động thông báo.')); } });
  }));
  const record = await setupStep('Chuẩn bị đăng ký trên trình duyệt', () => lock(async () => {
    check();
    await (await caches.open(CACHE)).delete(STATE);
    const previous = readPushRecord();
    let sub = await setupStep('Đọc đăng ký Web Push', () => r.pushManager.getSubscription());
    // A retired subscription must rotate, so queued pushes cannot cross accounts.
    if (sub) {
      const oldEndpoint = sub.endpoint;
      if (!await sub.unsubscribe()) throw new Error('Không thể xóa đăng ký cũ. Hãy thử lại.');
      sub = await setupStep('Tạo đăng ký Web Push', () => r.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: publicKey }));
      if (sub.endpoint === oldEndpoint || (previous?.owner !== owner && sub.endpoint === previous?.endpoint)) throw new Error('Không thể tạo đăng ký riêng cho tài khoản này.');
    }
    sub ??= await setupStep('Tạo đăng ký Web Push', () => r.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: publicKey }));
    if (previous && previous.owner !== owner && previous.endpoint === sub.endpoint) throw new Error('Đăng ký cũ chưa được thay thế.');
    check();
    const saved = { owner, scope, endpoint: sub.endpoint, proof: createProof() };
    localStorage.setItem(RECORD, JSON.stringify(saved)); // Persist before challenge, including ambiguous failures.
    const json = sub.toJSON();
    if (!json.keys?.p256dh || !json.keys.auth) throw new Error('Đăng ký thông báo không hợp lệ.');
    return { saved, subscription: { endpoint: sub.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } } };
  }));
  check();
  const { default: http } = await import('@/utils/http');
  const requestId = createProof();
  const worker = r.active;
  if (!worker || worker.scriptURL !== new URL('/shift-reminder-sw.js', location.origin).href) throw new Error('Worker không hợp lệ.');
  let receive: (event: MessageEvent) => void = () => {};
  let timeout: ReturnType<typeof setTimeout>;
  const receipt = new Promise<string>((resolve, reject) => {
    timeout = setTimeout(() => reject(new Error('Không nhận được thông báo xác minh.')), 60000);
    receive = event => {
      const data = event.data;
      if (event.source !== worker || event.origin !== location.origin || data?.type !== 'shift-push-possession-v1' || data.requestId !== requestId || data.endpoint !== record.saved.endpoint || !/^[\w-]{43}$/.test(data.nonce) || !Number.isFinite(data.expiresAt) || data.expiresAt <= Date.now() || data.expiresAt > Date.now() + 60000) return;
      try { check(); resolve(data.nonce); } catch (error) { reject(error); }
    };
    navigator.serviceWorker.addEventListener('message', receive);
  });
  // Install rejection handling immediately, even while the challenge HTTP call is pending.
  void receipt.catch(() => {});
  try {
    await setupStep('Chuẩn bị xác minh service worker', () => new Promise<void>((resolve, reject) => {
      const channel = new MessageChannel();
      const timer = setTimeout(() => { channel.port1.close(); reject(new Error('Worker chưa sẵn sàng.')); }, 5000);
      channel.port1.onmessage = event => {
        clearTimeout(timer); channel.port1.close();
        if (event.data?.requestId === requestId && event.data?.endpoint === record.saved.endpoint) resolve();
        else reject(new Error('Worker không hợp lệ.'));
      };
      worker.postMessage({ type: 'shift-push-arm-v1', requestId, endpoint: record.saved.endpoint }, [channel.port2]);
    }));
    check();
    const headers = { Authorization: `Bearer ${initialToken}` };
    await http.post('/shift-reminders/me/push/challenge', { subscription: record.subscription, proof: record.saved.proof, requestId }, { headers });
    const nonce = await receipt;
    check();
    if ((await r.pushManager.getSubscription())?.endpoint !== record.saved.endpoint) throw new Error('Đăng ký đã thay đổi.');
    check();
    await http.post('/shift-reminders/me/push/confirm', { endpoint: record.saved.endpoint, proof: record.saved.proof, requestId, nonce }, { headers });
    await lock(async () => {
      check();
      const digest = await session();
      check();
      await (await caches.open(CACHE)).put(STATE, new Response(JSON.stringify({ owner, scope: r.scope, endpoint: record.saved.endpoint, session: digest })));
      // Suppression can start while Cache.put is pending. Do not leave its gate behind.
      try { check(); } catch (error) { await (await caches.open(CACHE)).delete(STATE); throw error; }
    });
  } catch (error) {
    // Captured credentials/proof target only this attempt, even after an account switch.
    try { await http.delete('/shift-reminders/me/push', { data: { endpoint: record.saved.endpoint, proof: record.saved.proof }, headers: { Authorization: `Bearer ${initialToken}` } }); } catch { /* Keep proof for retry; local gate remains closed. */ }
    throw error;
  } finally {
    clearTimeout(timeout!);
    navigator.serviceWorker.removeEventListener('message', receive);
    await lock(async () => {
      const cache = await caches.open(CACHE), pending = await cache.match(PENDING);
      if (pending && (await pending.json()).requestId === requestId) await cache.delete(PENDING);
    });
  }
}
