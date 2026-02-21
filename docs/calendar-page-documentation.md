# Calendar Page Documentation

Updated: 2026-02-17
Scope: User-facing calendar/scheduling workflow (`/app/calendar`), excluding admin pages.

## 1. Page Purpose
The Calendar page should be the user scheduling hub for:
- Viewing scheduled and published posts
- Drag-and-drop rescheduling
- Managing draft posts
- AI ghost slot suggestions
- Optimal posting time recommendations
- Bulk scheduling

## 2. Route and Composition
Route (current):
- Child route uses absolute path `/app/calendar` in router config
  - `src/router/router.jsx:47`

Main page:
- `src/pages/CalendarPage/CalendarPageV2.jsx`

Primary components:
- Calendar surface: `src/pages/CalendarPage/components/CalendarView.jsx`
- Draft rail: `src/pages/CalendarPage/components/DraftsSidebar.jsx`
- Schedule modal: `src/pages/CalendarPage/components/ScheduleModal.jsx`
- Bulk scheduling: `src/pages/CalendarPage/components/BulkScheduleModal.jsx`
- Optimal times panel: `src/pages/CalendarPage/components/OptimalTimesPanel.jsx`
- Ghost slots:
  - `src/pages/CalendarPage/components/GhostSlotsToggle.jsx`
  - `src/pages/CalendarPage/components/GhostSlotCard.jsx`

State and services:
- Store: `src/stores/CalendarStore.js`
- Recommendation service: `src/services/OptimalTimesService.js`
- Daily analysis function: `supabase/functions/daily-analysis/index.ts`

## 3. Runtime Behavior (As Implemented)
On mount:
1. Fetch posts (`scheduled`, `published`, `publishing`, `failed`)
2. Fetch drafts (`status='draft'`)
3. Fetch calendar settings (create default if missing)
4. If ghost slots enabled, fetch active ghost slots

Calendar interactions:
- Month/week/day visual modes
- Drag-and-drop in month view updates `posts.scheduled_at`
- Clicking a post or draft opens schedule modal
- Bulk schedule modal can auto-assign recommendation times

Ghost slots:
- Toggle enable/disable in `calendar_settings`
- Dismiss action updates slot status to `dismissed`
- Current component forces full page reload after dismiss

Optimal times:
- Panel reads `optimal_posting_times` rows (`sample_size >= 3`)
- Bulk scheduler uses `getRecommendedTime` from service

## 4. Schema Relationships Used
- `posts.user_id -> auth.users.id`
- `posts.generation_id -> generations.id`
- `posts.account_id -> connected_accounts.id`
- `ghost_slots.user_id -> auth.users.id`
- `ghost_slots.content_pillar_id -> content_pillars.id`
- `calendar_settings.user_id -> auth.users.id`
- `optimal_posting_times.user_id -> auth.users.id`
- `platform_analytics.post_id -> posts.id`

## 5. What Must Be In Place
Database and policies:
- RLS for user-scoped CRUD on `posts`, `ghost_slots`, `calendar_settings`, `content_pillars`
- Read access for user-scoped `optimal_posting_times`

Required backend jobs/functions:
- Daily analyzer (or equivalent) that:
  - updates `optimal_posting_times`
  - generates `ghost_slots`
  - refreshes `trending_topics`
- Publishing worker to move `posts.scheduled -> publishing -> published/failed`
- Analytics sync worker to populate `platform_analytics`

Required DB support functions:
- `get_best_posting_time` RPC if using store helper path

Indexes:
- `posts(user_id, status, scheduled_at)`
- `ghost_slots(user_id, status, suggested_date, expires_at)`
- `optimal_posting_times(user_id, platform, day_of_week, score)`

## 6. Current Gaps and Required Fixes
P0
- Single-item schedule modal does not persist schedule updates.
  - Parent passes `post` and ignores returned datetime:
    - `src/pages/CalendarPage/CalendarPageV2.jsx:221`
    - `src/pages/CalendarPage/CalendarPageV2.jsx:223`
  - Modal API expects `generation` prop and only emits datetime:
    - `src/pages/CalendarPage/components/ScheduleModal.jsx:5`
    - `src/pages/CalendarPage/components/ScheduleModal.jsx:39`

- Optimal-time analytics pipeline platform filter is broken because platform source is not selected from relation in analysis paths.
  - Client service filter:
    - `src/services/OptimalTimesService.js:47`
  - Edge function filter:
    - `supabase/functions/daily-analysis/index.ts:137`

P1
- Realtime subscription API in store is broken and unused.
  - Missing `await` on `supabase.auth.getUser()` inside subscribe function:
    - `src/stores/CalendarStore.js:448`
  - `CalendarPageV2` never calls `subscribeToUpdates`

- Draft fetch does not join `connected_accounts`, while UI reads `draft.connected_accounts`.
  - Query lacks relation:
    - `src/stores/CalendarStore.js:71`
  - UI assumes relation exists:
    - `src/pages/CalendarPage/components/DraftsSidebar.jsx:46`
    - `src/pages/CalendarPage/components/BulkScheduleModal.jsx:47`

P1
- Ghost slot dismiss triggers full page reload instead of store update.
  - `src/pages/CalendarPage/components/GhostSlotCard.jsx:23`

P2
- Analytics icon is placeholder alert (no actual page or panel route).
  - `src/pages/CalendarPage/CalendarPageV2.jsx:184`
- Legacy/unused calendar view component remains in tree.
  - `src/pages/CalendarPage/components/CalendarGrid.jsx`

## 7. Recommended Target Behavior
- Scheduling paths should be explicit:
  - existing post reschedule
  - draft -> scheduled conversion
  - ghost slot -> draft/scheduled conversion via `acceptGhostSlot`
- Calendar should subscribe to store realtime updates and patch local state, not reload
- Analytics button should open a real user analytics page or integrated panel
- Draft lifecycle should be complete from Generate -> Draft -> Calendar -> Scheduled

## 8. Acceptance Criteria
- Scheduling from modal writes to DB and updates UI instantly
- Ghost slot accept/dismiss actions update store without page reload
- Optimal times reflect real platform-specific published post performance
- Bulk schedule shows real platform metadata from joined relations
