# Command — Personal Project Tracker: Design Spec

**Date:** 2026-06-05
**Phase:** 1 — Local-only deployable website
**Status:** Approved

---

## Problem & Goal

Sudip is an engineer with multiple active fronts — projects, courses, work, and goals — spanning different devices, contexts, and time horizons. When he sits down to work, he spends mental energy deciding what to work on instead of actually working.

**Goal:** A lightweight personal command center that:
- Eliminates the "what next" decision at the start of every session
- Captures anything instantly without breaking flow
- Gives an honest weekly picture of what's active, parked, and done
- Takes less than 5 minutes a day to maintain and 20 minutes a week to review

---

## Scope

### Phase 1 (this spec)
- 5 views: Home (what next), Detail (per-front), Capture modal, Inbox, Weekly Review
- Front types: Projects, Learning, Articles
- Per-front cadence (weekday chips) and time windows (soft nudges only)
- Dependencies / prerequisites between fronts
- Session timer (start → in-progress → done with optional log)
- Inline editing of fronts, items, and captures
- Reorder open items within a front
- localStorage persistence — survives reload, works offline
- Laptop-first layout

### Out of scope (future phases)
- Cloud sync / database backend
- Mobile / responsive layout
- PWA install
- LLM integration
- GitHub activity integration

---

## Tech Stack

| Concern | Choice | Reason |
|---|---|---|
| Build | Vite + React 18 | Fast, zero-config, HMR |
| Language | TypeScript | Type safety; required for clean Phase 2 migration |
| State | Zustand with `persist` middleware | Lightweight, localStorage adapter is one-line swappable |
| Routing | React Router v6 | Client-side SPA navigation |
| Styling | Prototype CSS + design tokens | Visual design is already done; no UI library needed |
| Testing | Vitest + React Testing Library + Playwright | Unit, component, and E2E coverage |

---

## Project Structure

```
project-tracker/
  src/
    types/
      index.ts            # All TypeScript interfaces and enums
    store/
      index.ts            # Zustand store definition
      actions/
        fronts.ts         # addFront, updateFront, deleteFront
        items.ts          # addItem, updateItem, reorderItem, addLog
        captures.ts       # addCapture, fileCapture, deleteCapture
        session.ts        # startSession, pauseSession, resumeSession, endSession
    hooks/
      useScheduling.ts    # Scheduling engine hook (wraps pure function)
      useSession.ts       # Session timer tick (setInterval)
      useCapture.ts       # Keyboard shortcut + modal state
    views/
      HomeView.tsx
      DetailView.tsx
      ReviewView.tsx
    components/
      Sidebar.tsx
      SessionBar.tsx
      CaptureModal.tsx
      FrontModal.tsx
      ItemRow.tsx
      EditPopover.tsx
      Badge.tsx
      ConfirmDialog.tsx
    lib/
      scheduling.ts       # Pure function: getScheduledFronts()
      ids.ts              # nanoid wrapper
      time.ts             # Time window helpers
    styles/
      tokens.css          # Design tokens (oklch palette, spacing, type scale)
      global.css          # Reset + base styles
      components.css      # Shared component styles
    App.tsx               # Router root + SessionBar
    main.tsx
  tests/
    unit/
      scheduling.test.ts  # Scheduling engine — comprehensive
      store.test.ts       # Store actions + persistence
      time.test.ts        # Time window helpers
    component/
      HomeView.test.tsx
      DetailView.test.tsx
      CaptureModal.test.tsx
      SessionBar.test.tsx
    e2e/
      flows.spec.ts       # Critical user flows end-to-end
  docs/
    superpowers/
      specs/
        2026-06-05-project-tracker-design.md
```

---

## Data Model

```typescript
// src/types/index.ts

export type FrontType = 'project' | 'learning' | 'article';
export type FrontStatus = 'active' | 'parked' | 'done';
export type ItemStatus = 'open' | 'in_progress' | 'done';
export type FocusLevel = 'light' | 'medium' | 'deep';
export type CaptureType = 'idea' | 'link' | 'task';

export interface Log {
  id: string;
  text: string;
  createdAt: string; // ISO 8601
}

export interface Item {
  id: string;
  text: string;
  status: ItemStatus;
  order: number;          // explicit — reorder swaps values, no splice
  focusLevel?: FocusLevel;
  timeEstimate?: number;  // minutes
  logs: Log[];
  createdAt: string;
  startedAt?: string;
  doneAt?: string;
}

export interface Cadence {
  days: number[];                              // 0=Sun, 1=Mon … 6=Sat; [] means every day
  timeWindow?: { start: string; end: string }; // "09:00", "22:00"
}

export interface Front {
  id: string;
  name: string;
  type: FrontType;
  color: string;           // oklch hue value, e.g. "210"
  status: FrontStatus;
  items: Item[];
  cadence: Cadence;
  prerequisites: string[]; // front IDs that must be FrontStatus='done' first
  parkReason?: string;
  createdAt: string;
}

export interface Capture {
  id: string;
  text: string;
  type?: CaptureType;
  frontId?: string;  // undefined = inbox; set when filed to a front
  createdAt: string;
}

export interface Session {
  frontId: string;
  itemId: string;
  startedAt: string; // ISO 8601
  elapsed: number;   // seconds accumulated (survives pause/resume)
  paused: boolean;
}
```

**Invariants:**
- `Item.order` values within a front are unique non-negative integers. Reordering swaps two values.
- `Front.prerequisites` contains only IDs of other fronts in the store.
- `Session` is excluded from localStorage persistence — it resets to `null` on reload.
- All `id` fields are generated with nanoid (21-char URL-safe strings).
- All timestamps are ISO 8601 strings (`new Date().toISOString()`).

---

## Store

```typescript
// src/store/index.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Front, Item, Capture, Session } from '../types';

interface AppStore {
  // State
  fronts: Front[];
  captures: Capture[];        // all captures; inbox = captures where frontId is undefined
  session: Session | null;    // NOT persisted

  // Front actions
  addFront: (data: Omit<Front, 'id' | 'createdAt' | 'items'>) => void;
  updateFront: (id: string, updates: Partial<Omit<Front, 'id' | 'createdAt'>>) => void;
  deleteFront: (id: string) => void;

  // Item actions
  addItem: (frontId: string, data: Pick<Item, 'text' | 'focusLevel' | 'timeEstimate'>) => void;
  updateItem: (frontId: string, itemId: string, updates: Partial<Omit<Item, 'id' | 'createdAt'>>) => void;
  reorderItem: (frontId: string, itemId: string, direction: 'up' | 'down') => void;
  addLog: (frontId: string, itemId: string, text: string) => void;

  // Capture / inbox actions
  addCapture: (data: Pick<Capture, 'text' | 'type'>) => void;
  fileCapture: (captureId: string, frontId: string) => void;
  deleteCapture: (captureId: string) => void;

  // Session actions
  startSession: (frontId: string, itemId: string) => void;
  pauseSession: () => void;
  resumeSession: () => void;
  tickSession: (seconds: number) => void;  // called by useSession hook
  endSession: (log?: string) => void;      // marks item done, optionally logs
  abandonSession: () => void;              // clears session without marking item done
}

export const useStore = create<AppStore>()(
  persist(
    (set, get) => ({ /* actions */ }),
    {
      name: 'command-v1',
      partialize: (state) => ({
        fronts: state.fronts,
        captures: state.captures,
        // session intentionally excluded
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.warn('localStorage rehydration failed, starting fresh', error);
        }
      },
    }
  )
);
```

**Storage key:** `command-v1`. When Phase 2 arrives, the `persist` storage option is swapped from `localStorage` to a custom adapter — no action or view code changes.

---

## Views & Routing

```tsx
// src/App.tsx
<BrowserRouter>
  <Sidebar />
  <Routes>
    <Route path="/"          element={<HomeView />} />
    <Route path="/front/:id" element={<DetailView />} />
    <Route path="/review"    element={<ReviewView />} />
    <Route path="*"          element={<Navigate to="/" />} />
  </Routes>
  <SessionBar />   {/* renders only when session !== null */}
  <CaptureModal /> {/* renders only when capture shortcut is active */}
</BrowserRouter>
```

### HomeView (`/`)

Runs the scheduling engine and renders four groups:

1. **Hero card** — single "start here" front with a prominent CTA
2. **Scheduled today** — on-cadence fronts with time window badges
3. **Not scheduled today** — off-day fronts, muted
4. **Locked** — fronts whose prerequisites are not done

Also contains the **Inbox panel** — a collapsible list of unfiled captures.

### DetailView (`/front/:id`)

Renders a single front. Redirects to `/` if the ID is not found.

Sections:
- Front header with status, cadence, time window, edit button
- Open items (reorderable, each with start/edit/log actions)
- In-progress item (highlighted, session controls if active)
- Done items (collapsible)
- Add item input

### ReviewView (`/review`)

Weekly summary. Data computed from store at render time — no separate state.

Sections:
- Metrics strip: sessions this week, total focus time, items completed
- Week timeline: one row per day, colored by front
- Per-front momentum: streak, items done this week, cadence compliance
- Active / Parked / Done front split

### CaptureModal (overlay)

Triggered by `C` or `⌘K` from any route. State lives in `useCapture` hook.

- Single text input — auto-detects type (link → link, #idea → idea, else task)
- Destination picker: Inbox or any active front
- `Enter` to save, `Esc` to dismiss

---

## Scheduling Engine

```typescript
// src/lib/scheduling.ts

export interface ScheduleGroups {
  hero: Front | null;
  scheduled: Front[];
  offDay: Front[];
  locked: Front[];
}

export function getScheduledFronts(
  fronts: Front[],
  now: Date
): ScheduleGroups
```

**Rules (in order):**

1. A front is **locked** if any of its `prerequisites` IDs refer to a front whose `status !== 'done'`.
2. A front is **off-day** if its `cadence.days` is non-empty and does not include `now.getDay()`.
3. A front is **scheduled** if it is active, not locked, and on-cadence for today.
4. **Hero** is selected from scheduled fronts: prefer the front whose `timeWindow.start` is earliest and closest to `now`. If no time windows are set, use creation order.
5. Parked and done fronts are excluded from all groups.

This is a **pure function** — same inputs always produce the same output. It has no side effects and does not read from the store directly. The `useScheduling` hook calls it with `useMemo`.

**Phase 2 note:** When LLM reasoning arrives, it replaces or augments this function with the same signature — views don't change.

---

## Components

### `Sidebar`
- Front list grouped by type (Projects / Learning / Articles)
- Each row: color dot, name, cadence indicator, lock icon if blocked
- "New front" button at bottom of each group
- Active route highlighted

### `SessionBar`
- Renders at App root; visible only when `session !== null`
- Shows: front name → item text → elapsed timer (ticking via `useSession`)
- Actions: Pause / Resume, +Log (opens inline text input), Done, Stop (abandons)

### `CaptureModal`
- Keyboard shortcut `C` or `⌘K`
- Auto-detect input type on submit
- Destination defaults to Inbox; dropdown to pick a front
- Dismisses on `Esc` or outside click

### `FrontModal`
- Used for both create and edit
- Fields: name, type (radio), color (hue picker), cadence (day chips + time window), prerequisites (multi-select of other fronts)
- Validates: name required, prerequisites cannot create cycles

### `ItemRow`
- Renders one item within DetailView
- Hover reveals: ↑/↓ reorder arrows, edit popover trigger
- Status badge: open / in_progress / done
- Start button → `startSession` (disabled if another session is active)

### `EditPopover`
- Small floating panel anchored to the trigger element
- Fields depend on context: item (text, focus level, time estimate) or capture (text, type)
- Auto-saves on blur / `Enter`; dismisses on `Esc`

### `Badge`
- Variants: cadence-dot, time-nudge (`"later · evenings"`), lock, streak
- Purely presentational

### `ConfirmDialog`
- Modal with title, description, Cancel / Confirm
- Used for: delete front, delete item, clear done items

---

## Error Handling

**localStorage corruption:** Zustand's `onRehydrateStorage` callback catches parse errors and starts with empty state. A one-time dismissible banner informs the user.

**Unknown front route:** `DetailView` reads `params.id`, checks against the store, and redirects to `/` if not found.

**Prerequisite cycles:** `FrontModal` validates that adding a prerequisite does not create a cycle (DFS check on the current front graph) before allowing save.

**No network errors, no auth errors, no loading states** in Phase 1 — all operations are synchronous local reads/writes.

---

## Testing Strategy

### Philosophy

Tests verify **behavior**, not implementation. A test that breaks when a variable is renamed is not a useful test. Tests that break when behavior changes are.

The scheduling engine and store actions are the core logic — they get the most coverage. UI component tests cover interaction contracts, not visual appearance (visual correctness is verified against the prototype by eye). E2E tests cover the flows a user actually runs every day.

---

### Unit Tests — `tests/unit/`

#### `scheduling.test.ts` — comprehensive

```
getScheduledFronts()
  grouping
    ✓ active front with today's day in cadence → scheduled
    ✓ active front with today's day NOT in cadence → offDay
    ✓ active front with empty cadence.days → scheduled (every day)
    ✓ parked front → excluded from all groups
    ✓ done front → excluded from all groups
    ✓ locked front (prerequisite active) → locked
    ✓ locked front (prerequisite parked) → locked
    ✓ locked front (prerequisite done) → scheduled (unlocked)
    ✓ front locked by one of multiple prerequisites → locked
    ✓ all prerequisites done → unlocked

  hero selection
    ✓ single scheduled front → hero
    ✓ no scheduled fronts → hero is null
    ✓ multiple scheduled, one has earliest timeWindow.start → that one is hero
    ✓ multiple scheduled, no time windows set → first by createdAt is hero
    ✓ hero is not also in scheduled list (excluded)

  time windows
    ✓ current time before timeWindow.start → nudge = 'later'
    ✓ current time within timeWindow → nudge = 'active'
    ✓ current time after timeWindow.end → nudge = 'passed'
    ✓ no timeWindow set → no nudge

  edge cases
    ✓ empty fronts array → all groups empty, hero null
    ✓ front with prerequisites pointing to non-existent IDs → treated as unlocked
    ✓ Sunday (day 0) handled correctly
```

#### `store.test.ts`

```
fronts
  ✓ addFront creates front with generated id and createdAt
  ✓ addFront with prerequisites stores the IDs
  ✓ updateFront merges partial updates, preserves other fields
  ✓ updateFront on unknown ID is a no-op
  ✓ deleteFront removes the front
  ✓ deleteFront removes the front's ID from other fronts' prerequisites

items
  ✓ addItem creates item with order = max(existing orders) + 1
  ✓ addItem on first item gets order 0
  ✓ updateItem merges partial updates
  ✓ updateItem on unknown frontId is a no-op
  ✓ updateItem on unknown itemId is a no-op
  ✓ reorderItem up swaps order with the item above
  ✓ reorderItem down swaps order with the item below
  ✓ reorderItem up on topmost item is a no-op
  ✓ reorderItem down on bottommost item is a no-op
  ✓ addLog appends a log entry with generated id and createdAt

captures
  ✓ addCapture creates capture with undefined frontId (inbox)
  ✓ fileCapture sets frontId on the capture
  ✓ fileCapture on unknown captureId is a no-op
  ✓ deleteCapture removes the capture
  ✓ deleteCapture on unknown id is a no-op

session
  ✓ startSession sets session with correct frontId, itemId, elapsed=0, paused=false
  ✓ startSession sets item status to in_progress
  ✓ pauseSession sets paused=true
  ✓ resumeSession sets paused=false
  ✓ tickSession increments elapsed by given seconds
  ✓ tickSession is a no-op when session is null
  ✓ tickSession is a no-op when session is paused
  ✓ endSession sets item status to done
  ✓ endSession with log appends log to the item
  ✓ endSession without log does not append a log
  ✓ endSession clears session to null
  ✓ abandonSession clears session to null without changing item status
  ✓ abandonSession is a no-op when session is null

persistence
  ✓ fronts and captures are included in persisted state
  ✓ session is excluded from persisted state
  ✓ store rehydrates fronts and captures from localStorage on init
  ✓ corrupted localStorage value → store initializes with empty state, no throw
```

#### `time.test.ts`

```
getTimeNudge(timeWindow, now)
  ✓ now before start → 'later'
  ✓ now equal to start → 'active'
  ✓ now within window → 'active'
  ✓ now equal to end → 'passed'
  ✓ now after end → 'passed'
  ✓ null timeWindow → null

isOnCadenceToday(cadence, now)
  ✓ days includes today → true
  ✓ days excludes today → false
  ✓ days is empty → true (every day)
  ✓ all days of week tested individually
```

---

### Component Tests — `tests/component/`

Uses React Testing Library with a test wrapper that provides a pre-populated store.

#### `HomeView.test.tsx`

```
✓ renders hero card for the on-cadence front with earliest time window
✓ renders "Not scheduled today" group for off-cadence fronts
✓ renders locked fronts with a lock indicator
✓ locked front shows which prerequisite is blocking it
✓ completing all prerequisites of a locked front moves it to scheduled
✓ inbox panel shows unfiled captures
✓ filing a capture from inbox removes it from inbox
✓ clicking a front card navigates to /front/:id
```

#### `DetailView.test.tsx`

```
✓ renders front name, type, cadence
✓ renders open items sorted by order
✓ renders in-progress item with session indicator
✓ renders done items (collapsed by default)
✓ clicking ↑ on an item moves it up in order
✓ clicking ↑ on the topmost item does nothing
✓ clicking ↓ on an item moves it down in order
✓ clicking ↓ on the bottommost item does nothing
✓ clicking Start on an item calls startSession
✓ Start button is disabled when a session is already active
✓ edit popover opens on trigger click
✓ edit popover saves on blur
✓ unknown front ID redirects to /
```

#### `CaptureModal.test.tsx`

```
✓ modal is hidden by default
✓ pressing C opens the modal
✓ pressing ⌘K opens the modal
✓ pressing Esc closes the modal
✓ submitting text with no prefix creates a capture of type 'task' in inbox
✓ submitting a URL creates a capture of type 'link'
✓ selecting a front destination files directly to that front, not inbox
✓ submitting empty text does not create a capture
✓ modal closes after successful submit
```

#### `SessionBar.test.tsx`

```
✓ not rendered when session is null
✓ rendered when session is active, shows front name and item text
✓ timer increments every second
✓ Pause button calls pauseSession
✓ Resume button calls resumeSession
✓ timer does not increment while paused
✓ +Log opens inline text input
✓ submitting log text calls endSession with log
✓ Done button calls endSession without log
✓ Stop button calls abandonSession, does not mark item done
```

---

### E2E Tests — `tests/e2e/flows.spec.ts`

Uses Playwright. Runs against the Vite dev server (`localhost:5173`).

```
Daily flow
  ✓ app loads with empty state (no fronts, empty home)
  ✓ user creates a Project front with a cadence of Mon-Fri
  ✓ front appears in sidebar under Projects
  ✓ user adds three items to the front
  ✓ items appear in detail view sorted by order
  ✓ user reorders an item; order persists after page reload
  ✓ user starts a session on an item; session bar appears
  ✓ user ends session with a log; item is marked done, log is visible
  ✓ session bar disappears after ending session

Capture flow
  ✓ pressing C opens capture modal from home view
  ✓ pressing C opens capture modal from detail view
  ✓ user captures text → appears in inbox on home view
  ✓ user files inbox capture to a front → disappears from inbox, appears in front
  ✓ capture with http:// URL auto-detected as 'link'

Dependencies flow
  ✓ front with unfinished prerequisite appears locked on home view
  ✓ completing all items of the prerequisite front unlocks the dependent front
  ✓ locked front's start button is not accessible

Persistence
  ✓ fronts survive page reload
  ✓ items survive page reload
  ✓ captures survive page reload
  ✓ active session does not survive page reload (resets to null)

Weekly review
  ✓ /review renders without error with empty data
  ✓ /review shows correct count of items completed this week
  ✓ /review shows streak of 0 for a front with no sessions
```

---

## Phase 2 Migration Path

When the product feels stable and cross-device sync is needed:

1. **Backend:** Add Supabase (PostgreSQL + REST API). Schema maps directly from the TypeScript types above.
2. **Store adapter swap:** Replace Zustand `persist`'s localStorage storage with a custom adapter that calls the Supabase REST API. One file change.
3. **Auth:** Add Supabase Auth (email magic link or Google OAuth). Wrap the router in an auth guard.
4. **LLM integration:** The `getScheduledFronts()` function signature stays the same — an LLM layer calls it with enriched context and overrides or augments the output.
5. **GitHub integration:** A background job fetches commit/PR activity and writes it as `Log` entries on the relevant front's items.

No view or component code changes for steps 1–3.

---

## Open Questions (resolved)

| Question | Decision |
|---|---|
| Hosting target | TBD — build is portable to any static host |
| PWA / installable | Phase 2 milestone, not Phase 1 |
| Mobile layout | Phase 2 milestone, not Phase 1 |
| Auth | Not needed in Phase 1 (personal, local-only) |
| LLM / GitHub | Future phases; scheduling engine designed as the integration point |
