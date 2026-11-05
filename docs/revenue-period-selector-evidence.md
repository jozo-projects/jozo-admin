# Revenue period selector — exact contract correction

## Scope and compatibility

Affected repositories: `/Users/quangdo/jozo-workspace/be-ezinn` and
`/Users/quangdo/jozo-workspace/jozo-admin` (workspace paths resolve through symlinks).
Existing staged membership work and index contents are preserved. No ledger
business-date changes, unrelated endpoints, environment/dependency changes,
installation, commit, push, deployment or application-data access.

## API contract

`GET /bill/revenue?startDate=<ISO>&endDate=<ISO>[&rangeMode=exact]`

- **Mode omitted:** unchanged legacy inclusive Vietnam calendar-day normalization
  (`startOf(day)` through `endOf(day)`, `$gte/$lte`). Same-date calls remain valid.
- **`rangeMode=exact`:** both timestamps must be explicit UTC (`Z`) or numeric
  offset ISO datetimes, with seconds and optional 1–3 fractional digits. Reject
  invalid calendar dates, missing timezone, invalid/equal/reversed instants with
  HTTP 400. No day normalization; return the requested instants as canonical
  `startDate`/`endDate` dates (JSON serializes them to UTC ISO).
- Exact predicates are `$gte: start, $lt: end` on **both** room bill `startTime`
  and retail sale `createdAt`. Internal off-hours remain part of the contiguous
  interval. Existing authorization, deduplication, financial/category aggregation
  and thousand-rounding remain unchanged.
- Any supplied unsupported mode, including empty string, arrays or objects,
  rejects with 400 rather than silently falling back.
- Admin API adapter adds optional third argument `"exact"`; existing two-argument
  clients omit the query entirely. Deploy backend support before this frontend
  revision; older backends would ignore the opt-in and still normalize days.

## Frontend

Actual page requests `rangeMode=exact` and the exact end, **without minus 1ms**.
The map uses backend totals, bill count, category totals and canonical bounds;
`exactRevenueBills` and its workaround test are removed. There is no UI interval
filter/recalculation. Existing explicit payment/benefit filters remain unchanged.

Selector behavior retained: business current date before 09:00 anchors to the
preceding date; daily 09:00 → next 03:00; Monday week; month day 6 → next day 6;
quarter = three Jozo months; editable custom business dates/exact datetime drafts
apply only on confirmation; previous/next/current, whole-week picker and staff
restriction remain. Quarter year permits partial typing/backspace, commits a
valid four-digit year and restores the canonical year on invalid-draft blur.
Mounted tests exercise empty/equal/reversed custom ranges without a parsing
exception, so CustomRange parsing was not changed.

## Observed RED → GREEN

Correction RED, before production edits:

- Backend new suite: **9 failed / 4 passed / 13 total**. Actual failures prove
  calendar normalization and inclusive-end predicates, invalid exact inputs and
  unsupported query modes were incorrectly accepted. Legacy/default and some
  already-invalid cases passed initially.
- Frontend: **2 failed / 12 passed / 14 total**: canonical category totals were
  discarded and custom request end was reduced by 1ms.
- Additional year/backspace regression: **1 failed / 13 passed / 14 total**
  (`202` immediately reverted to `2027`), then corrected.
- UTC-positive backend variant added as additional compatibility coverage, not
  claimed as a separately observed RED.

Final focused commands (run from their respective repositories):

```sh
# be-ezinn
./node_modules/.bin/jest --runInBand --silent src/services/bill.revenueRange.test.ts src/services/bill.service.test.ts
./node_modules/.bin/eslint src/services/bill.revenueRange.test.ts
git diff --check

# jozo-admin
./node_modules/.bin/vitest run src/utils/revenuePeriod.test.ts src/pages/RevenueStatisticsPage.period.test.ts
./node_modules/.bin/eslint src/apis/bill.apis.ts src/utils/revenuePeriod.ts src/utils/revenuePeriod.test.ts src/components/modules/RevenuePeriodSelector.tsx src/pages/RevenueStatisticsPage.period.test.ts src/pages/RevenueStatisticsPage.tsx
git diff --check
```

Final GREEN: backend **2 suites / 24 passed**, frontend **2 files / 14 passed**;
the listed scoped ESLint checks and both repositories' `git diff --check` and
`git diff --cached --check` passed (exit 0). Unsilenced backend runs logged expected
validation errors and mocked no-USB-printer initialization. No full test suite,
build or typecheck was run. Staged-diff SHA-256 values were identical before and
after: backend `23f7a5b21b211b34922d9d296c9c4acadf69bd6abfea8fc95cea93f5b363d46f`,
frontend `dff9bde1dad81261f3baea2be7a711317a6e7ebab514f2d36cb55021e475cd5e`.

## Evidence limits

Backend tests invoke the real controller/service with mocked response and Mongo
collection boundaries; predicates and metadata are asserted, not a live DB/HTTP
server. Frontend mounts the actual React page and real API adapter, mocking only
HTTP transport; fixtures return an in-range bill plus authoritative categories.
This is not live revenue, browser visual acceptance or deployed-runtime proof.
AgentDesk was unavailable; no ticket synchronization is claimed.
