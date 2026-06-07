# FrontModal Missing Fields Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three missing fields to `FrontModal` — Description (blurb), Time window, and First move — along with the data model and utility changes they require.

**Architecture:** Update `Cadence` to use a new `CadenceTime` type (replacing the unused `timeWindow` string-range format), add `blurb` to `Front`, make `addFront` return the new id (needed for First move auto-creation), then add the three fields to `FrontModal` one at a time with TDD.

**Tech Stack:** React 19, TypeScript, Zustand 5, Vitest, Testing Library

**Spec:** `docs/superpowers/specs/2026-06-07-front-modal-missing-fields.md`

---

## File Map

| File | Change |
|---|---|
| `src/types/index.ts` | Add `CadenceTime` interface; update `Cadence` (replace `timeWindow` with `time?: CadenceTime`); add `blurb?: string` to `Front` |
| `src/lib/time.ts` | Add `fmtHour`; update `getTimeNudge` signature + logic to use `CadenceTime` |
| `src/store/types.ts` | Change `addFront` return type from `void` to `string` |
| `src/store/slices/fronts.ts` | Generate id before `set()` so it can be returned |
| `src/components/FrontModal.tsx` | Add `TimePicker` component; add `blurb`, `time`, `firstTask` state; add three fields; update `handleSubmit` |
| `tests/unit/time.test.ts` | Replace old `getTimeNudge` tests; add `fmtHour` tests |
| `tests/unit/store.test.ts` | Add test: `addFront` returns the new id |
| `tests/component/FrontModal.test.tsx` | Add tests for description, time window, and first move |

---

## Task 1: Update types and fix `getTimeNudge`

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/lib/time.ts`
- Modify: `tests/unit/time.test.ts`

- [ ] **Step 1: Replace old `getTimeNudge` tests with new-format tests**

Replace the entire `describe('getTimeNudge', ...)` block in `tests/unit/time.test.ts` with:

```ts
describe('getTimeNudge', () => {
  const at = (h: number) => new Date(2026, 5, 5, h, 0, 0)

  it('returns null when time is undefined', () => {
    expect(getTimeNudge(undefined, at(12))).toBeNull()
  })
  it('returns null when time has no from or until', () => {
    expect(getTimeNudge({}, at(12))).toBeNull()
  })
  it('until: returns active when now is before the hour', () => {
    expect(getTimeNudge({ until: 10 }, at(8))).toBe('active')
  })
  it('until: returns passed when now equals the hour', () => {
    expect(getTimeNudge({ until: 10 }, at(10))).toBe('passed')
  })
  it('until: returns passed when now is after the hour', () => {
    expect(getTimeNudge({ until: 10 }, at(14))).toBe('passed')
  })
  it('from: returns later when now is before the hour', () => {
    expect(getTimeNudge({ from: 18 }, at(16))).toBe('later')
  })
  it('from: returns active when now equals the hour', () => {
    expect(getTimeNudge({ from: 18 }, at(18))).toBe('active')
  })
  it('from: returns active when now is after the hour', () => {
    expect(getTimeNudge({ from: 18 }, at(20))).toBe('active')
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run tests/unit/time.test.ts
```

Expected: TypeScript compile error — `getTimeNudge` still expects `{ start, end }`.

- [ ] **Step 3: Update `src/types/index.ts`**

Replace the `Cadence` interface and add `CadenceTime`. Also add `blurb` to `Front`:

```ts
export interface CadenceTime {
  from?: number    // hour 0–23: "after X" constraint
  until?: number   // hour 0–23: "before X" constraint
  label?: string   // e.g. "before 10am", "evenings"
}

export interface Cadence {
  days: number[]   // 0=Sun…6=Sat; [] means every day
  time?: CadenceTime
}

export interface Front {
  id: string
  name: string
  type: FrontType
  color: string
  status: FrontStatus
  items: Item[]
  cadence: Cadence
  prerequisites: string[]
  blurb?: string
  parkReason?: string
  createdAt: string
}
```

Remove the old `Cadence` interface (which had `timeWindow?: { start: string; end: string }`).

- [ ] **Step 4: Update `getTimeNudge` in `src/lib/time.ts`**

Replace the existing `getTimeNudge` function:

```ts
export function getTimeNudge(
  time: CadenceTime | undefined,
  now: Date
): TimeNudge | null {
  if (!time) return null
  const nowHour = now.getHours()
  if (time.until != null) return nowHour < time.until ? 'active' : 'passed'
  if (time.from != null) return nowHour >= time.from ? 'active' : 'later'
  return null
}
```

Add the import for `CadenceTime` at the top of the file:

```ts
import type { CadenceTime } from '@/types'
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
npx vitest run tests/unit/time.test.ts
```

Expected: all `getTimeNudge` tests pass. `isOnCadenceToday` and `formatElapsed` tests still pass.

- [ ] **Step 6: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/types/index.ts src/lib/time.ts tests/unit/time.test.ts
git commit -m "feat: add CadenceTime type, update Cadence and Front, update getTimeNudge"
```

---

## Task 2: Add `fmtHour` utility

**Files:**
- Modify: `src/lib/time.ts`
- Modify: `tests/unit/time.test.ts`

- [ ] **Step 1: Write failing tests for `fmtHour`**

Add this import to `tests/unit/time.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { formatElapsed, formatDate, getTimeNudge, isOnCadenceToday, fmtHour } from '@/lib/time'
```

Add a new describe block at the end of `tests/unit/time.test.ts`:

```ts
describe('fmtHour', () => {
  it('formats midnight as 12am', () => {
    expect(fmtHour(0)).toBe('12am')
  })
  it('formats 9 as 9am', () => {
    expect(fmtHour(9)).toBe('9am')
  })
  it('formats 10 as 10am', () => {
    expect(fmtHour(10)).toBe('10am')
  })
  it('formats noon as 12pm', () => {
    expect(fmtHour(12)).toBe('12pm')
  })
  it('formats 14 as 2pm', () => {
    expect(fmtHour(14)).toBe('2pm')
  })
  it('formats 18 as 6pm', () => {
    expect(fmtHour(18)).toBe('6pm')
  })
  it('formats 23 as 11pm', () => {
    expect(fmtHour(23)).toBe('11pm')
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run tests/unit/time.test.ts
```

Expected: FAIL — `fmtHour is not a function`.

- [ ] **Step 3: Implement `fmtHour` in `src/lib/time.ts`**

Add after `isOnCadenceToday`:

```ts
export function fmtHour(h: number): string {
  const period = h < 12 ? 'am' : 'pm'
  const display = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${display}${period}`
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx vitest run tests/unit/time.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/time.ts tests/unit/time.test.ts
git commit -m "feat: add fmtHour utility to time lib"
```

---

## Task 3: Make `addFront` return the new id

**Files:**
- Modify: `src/store/types.ts`
- Modify: `src/store/slices/fronts.ts`
- Modify: `tests/unit/store.test.ts`

- [ ] **Step 1: Write a failing test**

In `tests/unit/store.test.ts`, add this test inside the existing `describe('fronts', ...)` block, after the first `it(...)`:

```ts
it('addFront returns the new front id', () => {
  const id = useStore.getState().addFront(FRONT_DATA)
  expect(id).toBe(useStore.getState().fronts[0].id)
})
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
npx vitest run tests/unit/store.test.ts
```

Expected: TypeScript error — `addFront` currently returns `void`, which is not assignable to `string`.

- [ ] **Step 3: Update `FrontsSlice` type in `src/store/types.ts`**

Change the `addFront` signature:

```ts
export type FrontsSlice = {
  fronts: Front[]
  addFront: (data: Omit<Front, 'id' | 'createdAt' | 'items'>) => string
  updateFront: (id: string, updates: Partial<Omit<Front, 'id' | 'createdAt'>>) => void
  deleteFront: (id: string) => void
}
```

- [ ] **Step 4: Update `addFront` in `src/store/slices/fronts.ts`**

Generate the id before calling `set` so it can be returned:

```ts
addFront: (data) => {
  const id = generateId()
  set((state) => ({
    fronts: [
      ...state.fronts,
      { ...data, id, createdAt: new Date().toISOString(), items: [] },
    ],
  }))
  return id
},
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
npx vitest run tests/unit/store.test.ts
```

Expected: all store tests pass including the new one.

- [ ] **Step 6: Commit**

```bash
git add src/store/types.ts src/store/slices/fronts.ts tests/unit/store.test.ts
git commit -m "feat: make addFront return the new front id"
```

---

## Task 4: Add Description field to `FrontModal`

**Files:**
- Modify: `src/components/FrontModal.tsx`
- Modify: `tests/component/FrontModal.test.tsx`

- [ ] **Step 1: Write failing tests**

Add these two tests inside the `describe('FrontModal', ...)` block in `tests/component/FrontModal.test.tsx`:

```ts
it('create mode: submitting with description persists blurb on the front', async () => {
  render(<FrontModal onClose={vi.fn()} />)
  await userEvent.type(screen.getByPlaceholderText('e.g. Rust for systems'), 'My Project')
  await userEvent.type(screen.getByPlaceholderText('What is this front about?'), 'A learning project')
  await userEvent.click(screen.getByText('Create front'))
  expect(useStore.getState().fronts[0].blurb).toBe('A learning project')
})

it('edit mode: description is pre-populated from front.blurb', () => {
  const front = { ...EXISTING_FRONT, blurb: 'Old description' }
  useStore.setState({ fronts: [front], captures: [], session: null })
  render(<FrontModal front={front} onClose={vi.fn()} />)
  expect(screen.getByDisplayValue('Old description')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run tests/component/FrontModal.test.tsx
```

Expected: FAIL — placeholder `'What is this front about?'` not found.

- [ ] **Step 3: Add `blurb` state and Description field to `FrontModal`**

In `src/components/FrontModal.tsx`, add `blurb` state after the existing state declarations:

```ts
const [blurb, setBlurb] = useState(front?.blurb ?? '')
```

Add the Description field in the modal body, directly after the Type + Color `<div>` block:

```tsx
<Field label="Description" hint="one line about this front">
  <input
    value={blurb}
    onChange={(e) => setBlurb(e.target.value)}
    placeholder="What is this front about?"
    style={inputStyle}
  />
</Field>
```

Update `handleSubmit` to include `blurb`:

```ts
function handleSubmit() {
  if (!name.trim()) return
  const data = {
    name: name.trim(),
    type,
    color: String(hue),
    blurb: blurb.trim() || undefined,
    status: (front?.status ?? 'active') as FrontStatus,
    cadence: { days },
    prerequisites: prereqs,
  }
  if (isEdit) {
    useStore.getState().updateFront(front!.id, data)
  } else {
    useStore.getState().addFront(data)
  }
  onClose()
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx vitest run tests/component/FrontModal.test.tsx
```

Expected: all FrontModal tests pass including the two new ones.

- [ ] **Step 5: Commit**

```bash
git add src/components/FrontModal.tsx tests/component/FrontModal.test.tsx
git commit -m "feat: add Description field to FrontModal"
```

---

## Task 5: Add Time window field to `FrontModal`

**Files:**
- Modify: `src/components/FrontModal.tsx`
- Modify: `tests/component/FrontModal.test.tsx`

- [ ] **Step 1: Write failing tests**

Add these tests to `tests/component/FrontModal.test.tsx`:

```ts
it('time window defaults to Anytime — cadence.time is undefined', async () => {
  render(<FrontModal onClose={vi.fn()} />)
  await userEvent.type(screen.getByPlaceholderText('e.g. Rust for systems'), 'My Project')
  await userEvent.click(screen.getByText('Create front'))
  expect(useStore.getState().fronts[0].cadence.time).toBeUndefined()
})

it('time window: selecting Before saves { until: 10, label: "before 10am" }', async () => {
  render(<FrontModal onClose={vi.fn()} />)
  await userEvent.type(screen.getByPlaceholderText('e.g. Rust for systems'), 'My Project')
  await userEvent.click(screen.getByRole('button', { name: 'Before' }))
  await userEvent.click(screen.getByText('Create front'))
  expect(useStore.getState().fronts[0].cadence.time).toEqual({ until: 10, label: 'before 10am' })
})

it('time window: selecting After saves { from: 18, label: "evenings" }', async () => {
  render(<FrontModal onClose={vi.fn()} />)
  await userEvent.type(screen.getByPlaceholderText('e.g. Rust for systems'), 'My Project')
  await userEvent.click(screen.getByRole('button', { name: 'After' }))
  await userEvent.click(screen.getByText('Create front'))
  expect(useStore.getState().fronts[0].cadence.time).toEqual({ from: 18, label: 'evenings' })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run tests/component/FrontModal.test.tsx
```

Expected: FAIL — `Before` / `After` buttons not found.

- [ ] **Step 3: Add `TimePicker` component to `FrontModal.tsx`**

Add the following import at the top of `src/components/FrontModal.tsx`:

```ts
import { fmtHour } from '@/lib/time'
```

Add `CadenceTime` to the type import:

```ts
import type { Front, FrontType, FrontStatus, CadenceTime } from '@/types'
```

Define `TimePicker` as a local function component immediately before the `FrontModal` export:

```tsx
function TimePicker({
  value,
  onChange,
  hue = 256,
}: {
  value: CadenceTime | undefined
  onChange: (v: CadenceTime | undefined) => void
  hue?: number
}) {
  const mode = !value ? 'any' : value.until != null ? 'before' : 'after'
  const hour = value ? (value.until != null ? value.until : (value.from ?? 18)) : 10

  function computeLabel(t: { until?: number; from?: number }): string {
    if (t.until != null) return `before ${fmtHour(t.until)}`
    if (t.from != null) return t.from >= 18 ? 'evenings' : t.from >= 12 ? 'afternoons' : `${fmtHour(t.from)}+`
    return ''
  }

  function setMode(m: 'any' | 'before' | 'after') {
    if (m === 'any') { onChange(undefined); return }
    const t = m === 'before' ? { until: 10 } : { from: 18 }
    onChange({ ...t, label: computeLabel(t) })
  }

  function setHour(h: number) {
    const clamped = Math.max(5, Math.min(23, h))
    const t = mode === 'before' ? { until: clamped } : { from: clamped }
    onChange({ ...t, label: computeLabel(t) })
  }

  const segOptions: Array<{ value: 'any' | 'before' | 'after'; label: string }> = [
    { value: 'any', label: 'Anytime' },
    { value: 'before', label: 'Before' },
    { value: 'after', label: 'After' },
  ]

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      <div style={{ display: 'inline-flex', gap: 4, background: 'var(--sunk)', padding: 3, borderRadius: 9 }}>
        {segOptions.map((o) => {
          const active = mode === o.value
          return (
            <button
              key={o.value}
              onClick={() => setMode(o.value)}
              style={{
                padding: '5px 11px',
                borderRadius: 7,
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: '-0.01em',
                transition: 'all .12s',
                background: active ? 'var(--surface)' : 'transparent',
                color: active ? 'var(--ink)' : 'var(--ink-3)',
                boxShadow: active ? 'var(--shadow-1)' : 'none',
              }}
            >
              {o.label}
            </button>
          )
        })}
      </div>
      {mode !== 'any' && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 2, border: '1px solid var(--line)', borderRadius: 8, padding: 2 }}>
          <button
            onClick={() => setHour(hour - 1)}
            aria-label="Decrease hour"
            style={{ width: 26, height: 26, borderRadius: 6, color: 'var(--ink-3)', fontSize: 15 }}
          >
            −
          </button>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 600, minWidth: 42, textAlign: 'center' }}>
            {fmtHour(hour)}
          </span>
          <button
            onClick={() => setHour(hour + 1)}
            aria-label="Increase hour"
            style={{ width: 26, height: 26, borderRadius: 6, color: 'var(--ink-3)', fontSize: 15 }}
          >
            +
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Wire `time` state and Time window field into `FrontModal`**

Add `time` state after the existing state declarations:

```ts
const [time, setTime] = useState<CadenceTime | undefined>(front?.cadence.time)
```

Add the Time window field in the modal body, directly after the Cadence (days) field:

```tsx
<Field label="Time window" hint="when it's best — soft nudge only">
  <TimePicker value={time} onChange={setTime} hue={hue} />
</Field>
```

Update `handleSubmit` to include `time` in cadence:

```ts
function handleSubmit() {
  if (!name.trim()) return
  const data = {
    name: name.trim(),
    type,
    color: String(hue),
    blurb: blurb.trim() || undefined,
    status: (front?.status ?? 'active') as FrontStatus,
    cadence: { days, time },
    prerequisites: prereqs,
  }
  if (isEdit) {
    useStore.getState().updateFront(front!.id, data)
  } else {
    useStore.getState().addFront(data)
  }
  onClose()
}
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
npx vitest run tests/component/FrontModal.test.tsx
```

Expected: all FrontModal tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/FrontModal.tsx tests/component/FrontModal.test.tsx
git commit -m "feat: add Time window field to FrontModal"
```

---

## Task 6: Add First move field to `FrontModal`

**Files:**
- Modify: `src/components/FrontModal.tsx`
- Modify: `tests/component/FrontModal.test.tsx`

- [ ] **Step 1: Write failing tests**

Add these tests to `tests/component/FrontModal.test.tsx`:

```ts
it('create mode: first move creates the front and one item with that text', async () => {
  render(<FrontModal onClose={vi.fn()} />)
  await userEvent.type(screen.getByPlaceholderText('e.g. Rust for systems'), 'My Project')
  await userEvent.type(screen.getByPlaceholderText("What's step one?"), 'Set up repo')
  await userEvent.click(screen.getByText('Create front'))
  const front = useStore.getState().fronts[0]
  expect(front.items).toHaveLength(1)
  expect(front.items[0].text).toBe('Set up repo')
  expect(front.items[0].focusLevel).toBe('medium')
})

it('create mode: empty first move creates the front with zero items', async () => {
  render(<FrontModal onClose={vi.fn()} />)
  await userEvent.type(screen.getByPlaceholderText('e.g. Rust for systems'), 'My Project')
  await userEvent.click(screen.getByText('Create front'))
  expect(useStore.getState().fronts[0].items).toHaveLength(0)
})

it('first move field is not shown in edit mode', () => {
  useStore.setState({ fronts: [EXISTING_FRONT], captures: [], session: null })
  render(<FrontModal front={EXISTING_FRONT} onClose={vi.fn()} />)
  expect(screen.queryByPlaceholderText("What's step one?")).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run tests/component/FrontModal.test.tsx
```

Expected: FAIL — placeholder `"What's step one?"` not found.

- [ ] **Step 3: Add `firstTask` state and First move field to `FrontModal`**

Add `firstTask` state after the existing state declarations:

```ts
const [firstTask, setFirstTask] = useState('')
```

Add the First move field at the **end** of the modal body (after the Prerequisites field), wrapped in `{!isEdit && ...}`:

```tsx
{!isEdit && (
  <Field label="First move" hint="your starting next-action">
    <input
      value={firstTask}
      onChange={(e) => setFirstTask(e.target.value)}
      placeholder="What's step one?"
      style={inputStyle}
    />
  </Field>
)}
```

Update `handleSubmit` — the `else` branch now uses the returned id to optionally call `addItem`:

```ts
function handleSubmit() {
  if (!name.trim()) return
  const data = {
    name: name.trim(),
    type,
    color: String(hue),
    blurb: blurb.trim() || undefined,
    status: (front?.status ?? 'active') as FrontStatus,
    cadence: { days, time },
    prerequisites: prereqs,
  }
  if (isEdit) {
    useStore.getState().updateFront(front!.id, data)
  } else {
    const newId = useStore.getState().addFront(data)
    if (firstTask.trim()) {
      useStore.getState().addItem(newId, { text: firstTask.trim(), focusLevel: 'medium' })
    }
  }
  onClose()
}
```

- [ ] **Step 4: Run all tests to confirm everything passes**

```bash
npx vitest run
```

Expected: all 151+ tests pass with the new ones added.

- [ ] **Step 5: Commit**

```bash
git add src/components/FrontModal.tsx tests/component/FrontModal.test.tsx
git commit -m "feat: add First move field to FrontModal"
```
