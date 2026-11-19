# Personal shift reminder push

> **Current local implementation:** The client uses a possession challenge and confirmation, not legacy PUT; a session-backed login and configured backend are required. Existing records are not silently activated. The older PUT and security-hold claims below are historical. Mocked browser/worker tests do not establish real provider or physical-device delivery. This local change is not a deployment.

Frontend only. The opt-in card is on `/my-schedule`, behind the existing authenticated route. It uses the existing HTTP client and the supplied GET/PUT/DELETE `/shift-reminders/me/push` contract. GET only checks configuration; it does not imply registration or delivery.

The user must press the enable button. Notification permission is requested directly in that gesture, before awaiting registration/network work. The UI handles unsupported/insecure contexts, iOS Home Screen guidance, denied/default/granted permission, unconfigured service, loading and request failures. A minimal standalone manifest enables the Home Screen flow. Web Locks and Cache Storage are required in addition to Push/Notifications/Service Worker support.

## Ownership and cleanup

- A 32-byte cryptographically random base64url proof is persisted in localStorage before PUT. PUT and DELETE send it with the endpoint. Ambiguous failures preserve the proof. No proof, access token, payload text or payload URL appears in a notification.
- The worker reads a separate Cache Storage gate containing owner, endpoint, worker scope and a session digest. It ignores the push payload and displays only generic text. Clicks check the gate again, then navigate/focus a same-origin window at `/my-schedule`, or open that route.
- A fresh opt-in after suppression uses a fresh random worker scope. A retired worker cannot pass the new scope gate, including when an old push was already queued. Endpoint reuse across owners is rejected locally; server proof enforcement is still required.
- Logout blocks new opt-ins, invalidates pending ones across tabs, clears the worker gate and closes notifications under the same Web Lock used for display. It then attempts authenticated DELETE before removing credentials. Unsubscribe/DELETE failures do not reopen the gate. Local suppression failure prevents voluntary logout rather than switching accounts with uncertain local state.
- Login clears ownership before replacing credentials. Auth startup reconciles ownership/session; token storage events update other tabs and suppress old ownership. The HTTP 401 path clears ownership before redirecting. A response sent with an old token cannot clear a newer session.
- Each opt-in is personal to this browser profile/Home Screen install. No automatic resubscription or permission prompt occurs on load or subscription expiry. Expired/missing browser subscriptions require a new explicit opt-in. Retired registrations remain inert until device disable/logout cleans them up; they do not cache pages or intercept fetches.

## Validation

Focused command:

```sh
npm test -- src/services/shift-push.test.ts src/components/modules/ShiftPushSettings.test.ts src/hooks/useLogout.push.test.ts src/utils/http.push.test.ts src/components/modules/ShiftReminderSettings.test.ts src/components/modules/ShiftProgressCard.test.ts
```

Tests use mocked browser APIs and execute the actual worker script in a VM. They do not demonstrate real push delivery. Before release, verify an HTTPS browser and an iOS 16.4+ Home Screen install with a configured backend: enable, deny permission, disable offline, logout offline, switch accounts in two tabs, click with an existing window/no window, and send to a retired subscription. Check that old-account notifications remain suppressed.

The app cannot retract an OS notification already seen, guarantee OS delivery, or control a browser-generated generic notification for a suppressed push. Browser storage eviction/permission revocation requires opting in again. Backend scheduling, VAPID private keys, sending, endpoint/proof authorization and expired-endpoint cleanup are outside this change. No delivery has been tested or claimed.

References: [MDN PushManager.subscribe](https://developer.mozilla.org/en-US/docs/Web/API/PushManager/subscribe), [WebKit Home Screen Web Push](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/).

## Files changed for this implementation

- `src/services/shift-push.ts`, `src/services/shift-push.test.ts`: browser subscription lifecycle, proof persistence, ownership and focused tests.
- `public/shift-reminder-sw.js`: isolated push worker and fixed click destination.
- `src/components/modules/ShiftPushSettings.tsx`, `src/components/modules/ShiftPushSettings.test.ts`: opt-in UI and tests.
- `src/pages/MyWork/index.tsx`: places the card on My Schedule.
- `src/hooks/useLogout.ts`, `src/hooks/useLogout.push.test.ts`: authenticated revocation before logout and tests.
- `src/pages/LoginPage.tsx`, `src/context/Authorization.context.tsx`: login/startup/cross-tab ownership cleanup.
- `src/utils/http.ts`, `src/utils/http.push.test.ts`: 401 cleanup, request credential pinning and tests.
- `index.html`, `public/manifest.webmanifest`: standalone Home Screen manifest.
- `docs/shift-push.md`: implementation notes and manual verification checklist.

Validation during implementation: 31 tests passed across six focused/adjacent suites; targeted lint, worker syntax and diff whitespace checks passed. Repository-wide lint reports 15 existing errors and 19 warnings outside these changes. `tsc --noEmit -p tsconfig.app.json` reports seven existing possibly-undefined errors in the pre-existing untracked `ShiftProgressCard.tsx`. Those files/work were preserved. No full build, commit, backend/env change or deployment was performed.

## Possession continuation (2026-11-16)

The page now uses POST challenge/confirm, never legacy PUT. It arms the exact worker, checks a narrowly routed encrypted nonce, and enables its local gate only after confirmation with unchanged session/epoch. The worker shows a generic visible verification notification (including on iOS) and sends the nonce only to the initiating client. Failed, cancelled and overlapping attempts remain suppressed; cleanup uses captured credentials/proof.

Actual browser/service-worker/iOS delivery still requires independent validation. Earlier sandbox Mongo/socket failures do not describe the current local test environment; rerun the focused tests for current evidence. Existing earlier descriptions of PUT registration are historical and do not describe the current flow.
