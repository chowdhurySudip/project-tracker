# Intelligent Focus Selection

**Date:** 2026-06-10
**Status:** Approved

## Problem

The home screen currently shows one item per front by picking the first `open` item in array order (`front.items.find(i => i.status === 'open')`). This is purely positional — it ignores time of day, item importance, and how long items have been waiting.

## Goals

- Surface a single global "focus now" item across all fronts, not one per front
- Use the front's cadence time window (`cadence.time.from`/`until`) to prefer items from fronts that are scheduled for right now
- Allow manual priority (`high / normal / low`) on items as an override signal
- Fix orphaned `focusLevel` and `timeEstimate` fields (stored in the type but with no UI to set them)

## Out of scope

- Item creation form changes — stays text-only (fast capture)
- Front creation changes — `FrontModal` already supports `cadence.time`
- Any AI/ML-based scoring

---

## Section 1: Data model

Add one optional field to `Item` in `src/types/index.ts`:

```ts
priority?: 'high' | 'normal' | 'low'
```

Absent priority is treated as `'normal'`. No migration needed — existing items without the field behave as normal priority.

No other type changes. `focusLevel`, `timeEstimate`, `createdAt`, and `cadence.time` on fronts are already sufficient for the algorithm.

---

## Section 2: Selection algorithm

New function `getGlobalFocusItem(fronts: Front[], now: Date)` added to `src/lib/scheduling.ts`.

**Returns:** `{ item: Item; front: Front } | null`

**Logic:**

1. Collect candidate fronts by calling the existing `getScheduledFronts(fronts, now).scheduled` — reuses the active/today/not-locked filtering already there
2. If any candidate front has an `in_progress` item → return that item + front immediately (continue what you started)
3. Collect all `open` items from candidate fronts, tagging each with its front
4. Compute a sort key for each item:
   - `tier`: `high → 0`, `normal / absent → 1`, `low → 2`
   - `timeActive`: front's `cadence.time.from <= now.hour < cadence.time.until` → `0`, else `1`. Fronts with no `cadence.time` set: `1` (neutral — not boosted, not penalised)
   - `staleness`: `item.createdAt` ISO string ascending (older = higher priority)
5. Sort by `(tier, timeActive, staleness)` — pick first
6. Return `{ item, front }` or `null` if no candidates

**Example:** At 10am, a front with `cadence.time = { from: 9, until: 13 }` has its items treated as `timeActive = 0`. A `normal` priority item from that front beats a `normal` priority item from an all-day front. A `high` priority item from any front beats both.

---

## Section 3: UI changes

### HeroCard (HomeView)

The top hero card is fed the result of `getGlobalFocusItem` instead of `getNextItem(scheduled[0])`.

- Displays the globally selected item
- Shows the front name and color as context (e.g. "from *Learning React*") so it's clear where the item lives
- Start button calls `startItem(front.id, item.id)` as before
- If `getGlobalFocusItem` returns `null` → shows "All items complete"

### Scheduled front cards (HomeView)

Unchanged. Each card still shows its own per-front next open item for visibility. Only the hero card changes.

### Item edit modal (new component: `ItemEditModal`)

Clicking an item's text (currently opens inline rename) instead opens a modal with four fields:

| Field | Control | Notes |
|---|---|---|
| Text | Text input | Required |
| Priority | Segmented: low / normal / high | Defaults to normal |
| Focus level | Segmented: light / medium / deep + clear | Optional, clears to unset |
| Time estimate | Number input (minutes) + clear | Optional, clears to unset |

On commit: `updateItem(frontId, item.id, { text, priority, focusLevel, timeEstimate })`

Style follows the existing `FrontModal` overlay pattern (same backdrop, border-radius, shadow, animation).

### EditPopover retirement

`EditPopover` (text-only inline rename) is retired. `ItemEditModal` fully replaces it. All call sites in `ItemRow` updated.

---

## Section 4: Item creation — no change

The add-item row in `DetailView` stays text-only (`type + Enter`). Priority defaults to `normal` (absent). Users set priority/focusLevel/timeEstimate after creation via `ItemEditModal`. This keeps capture fast.

---

## Files touched

| File | Change |
|---|---|
| `src/types/index.ts` | Add `priority` field to `Item` |
| `src/lib/scheduling.ts` | Add `getGlobalFocusItem` function |
| `src/views/HomeView.tsx` | Feed hero card from `getGlobalFocusItem`; show front-name context |
| `src/components/ItemRow.tsx` | Replace inline text edit with `ItemEditModal` trigger |
| `src/components/ItemEditModal.tsx` | New component |
| `src/components/EditPopover.tsx` | Retired (deleted) |
