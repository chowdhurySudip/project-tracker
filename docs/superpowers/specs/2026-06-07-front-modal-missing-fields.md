# Front Modal — Missing Fields

**Date:** 2026-06-07
**Status:** Approved

## Overview

Three fields present in the design prototype are missing from the current `FrontModal` implementation: **Time window**, **First move**, and **Description**. This spec covers adding all three, along with the data model changes needed to support them.

## Background

The design prototype (`docs/superpowers/plans/design-prototype/project/edit.jsx`) defines the following fields for creating/editing a front:

| Field | Mode | Current status |
|---|---|---|
| Name | both | ✅ implemented |
| Type | both | ✅ implemented |
| Color | both | ✅ implemented |
| Cadence (days) | both | ✅ implemented |
| Time window | both | ❌ missing |
| Prerequisites | both | ✅ implemented |
| Description (blurb) | both | ❌ missing |
| First move | new only | ❌ missing |

## Data Model Changes

### `Cadence` (`src/types/index.ts`)

Replace the existing `timeWindow?: { start: string; end: string }` with a `time` field using integer hours:

```ts
export interface CadenceTime {
  from?: number    // hour 0–23: "after X" constraint
  until?: number   // hour 0–23: "before X" constraint
  label?: string   // human-readable, e.g. "before 10am", "evenings"
}

export interface Cadence {
  days: number[]
  time?: CadenceTime
}
```

`CadenceTime` is exported as a named type so `FrontModal` and `getTimeNudge` can reference it directly without using the index accessor `Cadence['time']`.

Only one of `from` or `until` is set at a time. `time: null` / `time: undefined` means "Anytime". This namespace is the designated home for future scheduling additions (e.g. `durationTarget`, `snoozeUntil`).

### `Front` (`src/types/index.ts`)

Add one new optional field:

```ts
export interface Front {
  // ... existing fields unchanged ...
  blurb?: string   // one-line description of the front
}
```

## Store Changes

### `addFront` return value

`addFront` currently returns `void`. Change it to return the new front's `id: string`. This is required so `FrontModal` can call `addItem` immediately after creation when a "First move" is provided.

```ts
// FrontsSlice
addFront: (data: Omit<Front, 'id' | 'createdAt' | 'items'>) => string
```

The slice implementation generates the id before calling `set`, so it can return it synchronously.

### `addFront` / `updateFront` data shape

No other store changes needed. Both actions already accept the full `Front` data shape, so `blurb` and `cadence.time` flow through automatically once the type is updated.

## Utility Changes

### `fmtHour` (`src/lib/time.ts`)

New helper — formats an integer hour (0–23) to a short human-readable string:

```ts
export function fmtHour(h: number): string
// 9 → "9am", 10 → "10am", 14 → "2pm", 18 → "6pm"
```

Used by `TimePicker` to display the selected hour and compute the `label` string.

### `getTimeNudge` (`src/lib/time.ts`)

Update the function signature to accept the new `CadenceTime` shape:

```ts
export function getTimeNudge(
  time: CadenceTime | undefined,
  now: Date
): TimeNudge | null
```

Logic:
- `undefined` / no fields → `null`
- `from` set → `active` if `nowHour >= from`, else `later`
- `until` set → `active` if `nowHour < until`, else `passed`

## Component Changes

### `FrontModal` (`src/components/FrontModal.tsx`)

#### New state

```ts
const [blurb, setBlurb] = useState(front?.blurb ?? '')
const [time, setTime] = useState<CadenceTime | undefined>(front?.cadence.time)
const [firstTask, setFirstTask] = useState('')   // new fronts only
```

#### New fields

**Description** — shown in both create and edit modes, positioned after Type + Color:

```
Field label: "Description"
Hint: "one line about this front"
Input: single-line text, placeholder "What is this front about?"
```

**Time window** — shown in both modes, positioned after Cadence (days):

```
Field label: "Time window"
Hint: "when it's best — soft nudge only"
Control: TimePicker component (see below)
```

**First move** — shown in new-front mode only, positioned last in the body:

```
Field label: "First move"
Hint: "your starting next-action"
Input: single-line text, placeholder "What's step one?"
```

#### Field order in modal body

1. Name
2. Type + Color (side by side)
3. Description *(new)*
4. Cadence (day chips + presets)
5. Time window *(new)*
6. Prerequisites
7. First move *(new, new-front mode only)*

#### `handleSubmit` changes

Include `blurb` and updated `cadence` (with `time`) in the data passed to `addFront` / `updateFront`.

For new fronts, after `addFront` returns the new `id`, if `firstTask.trim()` is non-empty call:
```ts
addItem(newId, { text: firstTask.trim(), focusLevel: 'medium' })
```

### `TimePicker` component

Defined as a local function component inside `FrontModal.tsx` (not extracted to its own file — only used here).

```
Props: value: CadenceTime | null, onChange: (v: CadenceTime | null) => void, hue: number
```

**Layout:** Segmented control (Anytime / Before / After) followed by a ±1 hr spinner when Before or After is selected.

**Behavior:**

| Mode | Stored as | Example label |
|---|---|---|
| Anytime | `null` | — |
| Before | `{ until: h, label: "before 10am" }` | h defaults to 10 |
| After | `{ from: h, label: "evenings" }` | h defaults to 18; ≥19 shows "evenings", ≥12 shows "afternoons", else `fmtHour(h)+` |

Hour is clamped to 5–23. Label is recomputed on every hour change.

## Testing

Existing tests covering `FrontModal` (add front, edit front, delete front) must continue to pass. New test cases:

- Creating a front with a description persists `blurb` on the front
- Creating a front with a first move creates the front and then adds one item with that text
- Creating a front without a first move creates the front with zero items
- Editing a front can set / clear the description
- Setting time window to Before saves `{ until: h }` on `cadence.time`
- Setting time window to After saves `{ from: h }` on `cadence.time`
- Setting time window to Anytime clears `cadence.time` to `undefined`
- `getTimeNudge` returns correct `TimeNudge` values for `from`, `until`, and `undefined`
