# Intelligent Focus Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace per-front positional item selection with a single global "focus now" item chosen by priority tier, time-of-day match (cadence window), and staleness.

**Architecture:** Add a `priority` field to `Item`, implement `getGlobalFocusItem` in `src/lib/scheduling.ts` using priority gating + cadence time-window + staleness sorting, wire the `HeroCard` in `HomeView` to this result, and replace the text-only `EditPopover` with a full `ItemEditModal` that exposes all item metadata fields.

**Tech Stack:** TypeScript, React 19, Vitest, @testing-library/react, Zustand 5

---

## File Map

| File | Action |
|---|---|
| `src/types/index.ts` | Add `priority` field to `Item` |
| `src/store/types.ts` | Add `priority` to `addItem` data param |
| `src/store/slices/items.ts` | Wire `priority` into constructed `newItem` |
| `src/lib/scheduling.ts` | Export `FocusResult` type + `getGlobalFocusItem` |
| `src/components/ItemEditModal.tsx` | New modal: text, priority, focusLevel, timeEstimate |
| `src/components/ItemRow.tsx` | Replace inline edit with `ItemEditModal` trigger |
| `src/components/EditPopover.tsx` | Delete |
| `src/views/HomeView.tsx` | Wire `HeroCard` to `getGlobalFocusItem`; show all fronts in onDeck |
| `tests/unit/scheduling.test.ts` | Add `getGlobalFocusItem` tests |
| `tests/component/ItemEditModal.test.tsx` | New test file |
| `tests/component/ItemRow.test.tsx` | Update edit-trigger tests |
| `tests/component/HomeView.test.tsx` | Update hero card tests |
| `tests/component/EditPopover.test.tsx` | Delete |

---

## Task 1: Add `priority` to Item type and store

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/store/types.ts`
- Modify: `src/store/slices/items.ts`

- [ ] **Step 1: Add `priority` to the `Item` interface**

In `src/types/index.ts`, add `priority` as the line after `focusLevel`:

```ts
export interface Item {
  id: string
  text: string
  status: ItemStatus
  order: number
  focusLevel?: FocusLevel
  priority?: 'high' | 'normal' | 'low'
  timeEstimate?: number
  logs: Log[]
  createdAt: string
  startedAt?: string
  doneAt?: string
}
```

- [ ] **Step 2: Add `priority` to `addItem` data param**

In `src/store/types.ts`, update the `addItem` signature:

```ts
addItem: (frontId: string, data: Pick<Item, 'text' | 'focusLevel' | 'timeEstimate' | 'priority'>) => void
```

- [ ] **Step 3: Wire `priority` into `newItem` construction**

In `src/store/slices/items.ts`, add `priority: data.priority` to the `newItem` object (after `focusLevel`):

```ts
const newItem: Item = {
  id: generateId(),
  text: data.text,
  status: 'open',
  order: maxOrder + 1,
  focusLevel: data.focusLevel,
  priority: data.priority,
  timeEstimate: data.timeEstimate,
  logs: [],
  createdAt: new Date().toISOString(),
}
```

- [ ] **Step 4: Run the test suite to confirm no regressions**

```bash
npx vitest run
```

Expected: all existing tests pass (no tests reference `priority` yet, so no failures expected).

- [ ] **Step 5: Commit**

```bash
git add src/types/index.ts src/store/types.ts src/store/slices/items.ts
git commit -m "feat: add priority field to Item type and store"
```

---

## Task 2: `getGlobalFocusItem` function (TDD)

**Files:**
- Modify: `src/lib/scheduling.ts`
- Modify: `tests/unit/scheduling.test.ts`

- [ ] **Step 1: Write failing tests for `getGlobalFocusItem`**

Append to `tests/unit/scheduling.test.ts`:

```ts
import { getScheduledFronts, getGlobalFocusItem } from '@/lib/scheduling'

function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: 'item1',
    text: 'Do thing',
    status: 'open',
    order: 1,
    logs: [],
    createdAt: '2026-06-01T10:00:00.000Z',
    ...overrides,
  }
}
```

Add to the bottom of the file:

```ts
describe('getGlobalFocusItem', () => {
  it('returns null when no scheduled fronts have open items', () => {
    const f = makeFront({ id: 'f1', items: [] })
    expect(getGlobalFocusItem([f], MONDAY)).toBeNull()
  })

  it('returns null when no fronts at all', () => {
    expect(getGlobalFocusItem([], MONDAY)).toBeNull()
  })

  it('returns the single open item when only one exists', () => {
    const item = makeItem({ id: 'i1' })
    const f = makeFront({ id: 'f1', items: [item] })
    const result = getGlobalFocusItem([f], MONDAY)
    expect(result).not.toBeNull()
    expect(result!.item.id).toBe('i1')
    expect(result!.front.id).toBe('f1')
  })

  it('returns an in_progress item over any open item', () => {
    const open = makeItem({ id: 'open', status: 'open', priority: 'high' })
    const inProg = makeItem({ id: 'inprog', status: 'in_progress' })
    const f = makeFront({ id: 'f1', items: [open, inProg] })
    const result = getGlobalFocusItem([f], MONDAY)
    expect(result!.item.id).toBe('inprog')
  })

  it('picks high priority over normal within the same front', () => {
    const normal = makeItem({ id: 'n', priority: 'normal', createdAt: '2026-01-01T00:00:00.000Z' })
    const high = makeItem({ id: 'h', priority: 'high', createdAt: '2026-06-01T00:00:00.000Z' })
    const f = makeFront({ id: 'f1', items: [normal, high] })
    const result = getGlobalFocusItem([f], MONDAY)
    expect(result!.item.id).toBe('h')
  })

  it('picks normal priority over low', () => {
    const low = makeItem({ id: 'l', priority: 'low', createdAt: '2026-01-01T00:00:00.000Z' })
    const normal = makeItem({ id: 'n', createdAt: '2026-06-01T00:00:00.000Z' })
    const f = makeFront({ id: 'f1', items: [low, normal] })
    const result = getGlobalFocusItem([f], MONDAY)
    expect(result!.item.id).toBe('n')
  })

  it('treats absent priority as normal', () => {
    const low = makeItem({ id: 'l', priority: 'low', createdAt: '2026-01-01T00:00:00.000Z' })
    const implicit = makeItem({ id: 'i', createdAt: '2026-06-01T00:00:00.000Z' })
    const f = makeFront({ id: 'f1', items: [low, implicit] })
    const result = getGlobalFocusItem([f], MONDAY)
    expect(result!.item.id).toBe('i')
  })

  it('prefers time-active front items within same priority tier', () => {
    // MONDAY at 10:00 UTC
    const itemA = makeItem({ id: 'a', priority: 'normal', createdAt: '2026-01-01T00:00:00.000Z' })
    const itemB = makeItem({ id: 'b', priority: 'normal', createdAt: '2026-06-01T00:00:00.000Z' })
    const allDay = makeFront({ id: 'all', items: [itemA] }) // no cadence.time → neutral
    const morning = makeFront({ id: 'morning', items: [itemB], cadence: { days: [], time: { from: 9, until: 13 } } })
    // MONDAY is 2026-06-01T10:00 UTC → hour 10, within morning window
    const result = getGlobalFocusItem([allDay, morning], MONDAY)
    expect(result!.item.id).toBe('b') // time-active wins tiebreaker even though older
  })

  it('falls back to oldest createdAt when tier and timeActive are equal', () => {
    const newer = makeItem({ id: 'new', createdAt: '2026-06-01T00:00:00.000Z' })
    const older = makeItem({ id: 'old', createdAt: '2026-01-01T00:00:00.000Z' })
    const f = makeFront({ id: 'f1', items: [newer, older] })
    const result = getGlobalFocusItem([f], MONDAY)
    expect(result!.item.id).toBe('old')
  })

  it('ignores fronts not scheduled today', () => {
    const item = makeItem({ id: 'i1' })
    // weekdays-only front, tested on SUNDAY
    const f = makeFront({ id: 'f1', cadence: { days: [1, 2, 3, 4, 5] }, items: [item] })
    expect(getGlobalFocusItem([f], SUNDAY)).toBeNull()
  })

  it('ignores locked fronts', () => {
    const prereq = makeFront({ id: 'prereq', status: 'active', items: [] })
    const locked = makeFront({ id: 'locked', prerequisites: ['prereq'], items: [makeItem()] })
    expect(getGlobalFocusItem([prereq, locked], MONDAY)).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run tests/unit/scheduling.test.ts
```

Expected: all `getGlobalFocusItem` tests fail with "getGlobalFocusItem is not a function".

- [ ] **Step 3: Add `FocusResult` type and `getGlobalFocusItem` to `src/lib/scheduling.ts`**

Add the import for `Item` at the top (it's not currently imported — the file only imports `Front`):

```ts
import type { Front, Item } from '@/types'
```

Then append to the end of `src/lib/scheduling.ts`:

```ts
export interface FocusResult {
  item: Item
  front: Front
}

export function getGlobalFocusItem(fronts: Front[], now: Date): FocusResult | null {
  const { scheduled } = getScheduledFronts(fronts, now)

  for (const front of scheduled) {
    const ip = front.items.find((i) => i.status === 'in_progress')
    if (ip) return { item: ip, front }
  }

  const candidates: FocusResult[] = []
  for (const front of scheduled) {
    for (const item of front.items) {
      if (item.status === 'open') candidates.push({ item, front })
    }
  }

  if (candidates.length === 0) return null

  const hour = now.getUTCHours()

  const tierOf = (priority?: string): number =>
    priority === 'high' ? 0 : priority === 'low' ? 2 : 1

  const timeActiveOf = (front: Front): number => {
    const t = front.cadence.time
    if (!t || t.from == null || t.until == null) return 1
    return hour >= t.from && hour < t.until ? 0 : 1
  }

  candidates.sort((a, b) => {
    const tierDiff = tierOf(a.item.priority) - tierOf(b.item.priority)
    if (tierDiff !== 0) return tierDiff
    const timeDiff = timeActiveOf(a.front) - timeActiveOf(b.front)
    if (timeDiff !== 0) return timeDiff
    return a.item.createdAt.localeCompare(b.item.createdAt)
  })

  return candidates[0]
}
```

Also add `makeItem` helper to the test file imports — at the top of `tests/unit/scheduling.test.ts`, add the `Item` import:

```ts
import type { Front, Item } from '@/types'
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx vitest run tests/unit/scheduling.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/scheduling.ts tests/unit/scheduling.test.ts
git commit -m "feat: add getGlobalFocusItem with priority + time-active + staleness sorting"
```

---

## Task 3: `ItemEditModal` component (TDD)

**Files:**
- Create: `src/components/ItemEditModal.tsx`
- Create: `tests/component/ItemEditModal.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `tests/component/ItemEditModal.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ItemEditModal } from '@/components/ItemEditModal'
import { useStore } from '@/store'
import { resetStore } from './utils'

const FRONT_DATA = {
  name: 'F', type: 'project' as const, color: '256', status: 'active' as const,
  cadence: { days: [] as number[] }, prerequisites: [] as string[],
}

describe('ItemEditModal', () => {
  let frontId: string

  beforeEach(() => {
    resetStore()
    useStore.getState().addFront(FRONT_DATA)
    frontId = useStore.getState().fronts[0].id
  })

  function openModal(overrides = {}) {
    useStore.getState().addItem(frontId, { text: 'Original task' })
    const item = useStore.getState().fronts[0].items[0]
    const onClose = vi.fn()
    render(<ItemEditModal item={{ ...item, ...overrides }} frontId={frontId} onClose={onClose} />)
    return { item, onClose }
  }

  it('renders a dialog with the item text pre-filled', () => {
    openModal()
    expect(screen.getByRole('dialog', { name: 'Edit item' })).toBeInTheDocument()
    expect(screen.getByDisplayValue('Original task')).toBeInTheDocument()
  })

  it('shows priority buttons with normal selected by default', () => {
    openModal()
    const normalBtn = screen.getByRole('button', { name: 'normal' })
    expect(normalBtn).toBeInTheDocument()
    // normal is pre-selected (accent background); just confirm all three exist
    expect(screen.getByRole('button', { name: 'low' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'high' })).toBeInTheDocument()
  })

  it('shows pre-existing priority pre-selected', () => {
    useStore.getState().addItem(frontId, { text: 'Hi priority', priority: 'high' })
    const item = useStore.getState().fronts[0].items[0]
    render(<ItemEditModal item={item} frontId={frontId} onClose={vi.fn()} />)
    // high button should be rendered (visual test only; label confirms it exists)
    expect(screen.getByRole('button', { name: 'high' })).toBeInTheDocument()
  })

  it('Save button calls updateItem with new text', async () => {
    const { item } = openModal()
    const input = screen.getByDisplayValue('Original task')
    await userEvent.clear(input)
    await userEvent.type(input, 'Updated task')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(useStore.getState().fronts[0].items[0].text).toBe('Updated task')
  })

  it('Save button persists selected priority', async () => {
    openModal()
    await userEvent.click(screen.getByRole('button', { name: 'high' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(useStore.getState().fronts[0].items[0].priority).toBe('high')
  })

  it('Save button persists selected focusLevel', async () => {
    openModal()
    await userEvent.click(screen.getByRole('button', { name: 'deep' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(useStore.getState().fronts[0].items[0].focusLevel).toBe('deep')
  })

  it('toggling the same focusLevel twice clears it', async () => {
    useStore.getState().addItem(frontId, { text: 'T', focusLevel: 'deep' })
    const item = useStore.getState().fronts[0].items[0]
    render(<ItemEditModal item={item} frontId={frontId} onClose={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'deep' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(useStore.getState().fronts[0].items[0].focusLevel).toBeUndefined()
  })

  it('Save button persists timeEstimate as a number', async () => {
    openModal()
    const timeInput = screen.getByPlaceholderText('e.g. 30')
    await userEvent.type(timeInput, '45')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(useStore.getState().fronts[0].items[0].timeEstimate).toBe(45)
  })

  it('Enter key in text field saves', async () => {
    openModal()
    const input = screen.getByDisplayValue('Original task')
    await userEvent.clear(input)
    await userEvent.type(input, 'Via Enter{Enter}')
    expect(useStore.getState().fronts[0].items[0].text).toBe('Via Enter')
  })

  it('Cancel button calls onClose without saving', async () => {
    const { onClose } = openModal()
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalledOnce()
    expect(useStore.getState().fronts[0].items[0].text).toBe('Original task')
  })

  it('Escape key calls onClose', async () => {
    const { onClose } = openModal()
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('clicking backdrop calls onClose', async () => {
    const { onClose } = openModal()
    // The backdrop is the outermost div. Click outside the dialog.
    await userEvent.click(document.body)
    expect(onClose).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run tests/component/ItemEditModal.test.tsx
```

Expected: all tests fail with "Cannot find module '@/components/ItemEditModal'".

- [ ] **Step 3: Create `src/components/ItemEditModal.tsx`**

```tsx
import { useState } from 'react'
import { useStore } from '@/store'
import type { Item, FocusLevel } from '@/types'

interface ItemEditModalProps {
  item: Item
  frontId: string
  onClose: () => void
}

export function ItemEditModal({ item, frontId, onClose }: ItemEditModalProps) {
  const [text, setText] = useState(item.text)
  const [priority, setPriority] = useState<'high' | 'normal' | 'low'>(item.priority ?? 'normal')
  const [focusLevel, setFocusLevel] = useState<FocusLevel | ''>(item.focusLevel ?? '')
  const [timeEstimate, setTimeEstimate] = useState<string>(
    item.timeEstimate != null ? String(item.timeEstimate) : ''
  )

  function handleSave() {
    if (!text.trim()) return
    useStore.getState().updateItem(frontId, item.id, {
      text: text.trim(),
      priority,
      focusLevel: focusLevel || undefined,
      timeEstimate: timeEstimate ? Number(timeEstimate) : undefined,
    })
    onClose()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') onClose()
  }

  const segBtn = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: '7px 0',
    borderRadius: 8,
    border: '1px solid var(--line)',
    fontSize: 13,
    fontWeight: 600,
    background: active ? 'var(--accent)' : 'var(--surface-2)',
    color: active ? '#fff' : 'var(--ink-2)',
    cursor: 'pointer',
  })

  const fieldLabel: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--ink-3)',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    marginBottom: 6,
    display: 'block',
  }

  return (
    <div
      onMouseDown={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 70,
        background: 'oklch(0.3 0.01 90 / 0.34)',
        backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: '12vh',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Edit item"
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        style={{
          width: 'min(480px, 94vw)',
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 18,
          boxShadow: 'var(--shadow-3)',
          padding: 24,
          animation: 'sheetIn .22s cubic-bezier(.2,.8,.2,1) both',
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 20 }}>
          Edit item
        </div>

        {/* Text */}
        <div style={{ marginBottom: 16 }}>
          <span style={fieldLabel}>Task</span>
          <input
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
            style={{
              width: '100%', padding: '9px 12px', borderRadius: 8,
              border: '1px solid var(--line)', background: 'var(--surface-2)', fontSize: 14,
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Priority */}
        <div style={{ marginBottom: 16 }}>
          <span style={fieldLabel}>Priority</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['low', 'normal', 'high'] as const).map((p) => (
              <button key={p} onClick={() => setPriority(p)} style={segBtn(priority === p)}>
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Focus level */}
        <div style={{ marginBottom: 16 }}>
          <span style={fieldLabel}>Focus level</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['light', 'medium', 'deep'] as const).map((fl) => (
              <button
                key={fl}
                onClick={() => setFocusLevel(focusLevel === fl ? '' : fl)}
                style={segBtn(focusLevel === fl)}
              >
                {fl}
              </button>
            ))}
          </div>
        </div>

        {/* Time estimate */}
        <div style={{ marginBottom: 24 }}>
          <span style={fieldLabel}>Time estimate (minutes)</span>
          <input
            type="number"
            min={1}
            value={timeEstimate}
            onChange={(e) => setTimeEstimate(e.target.value)}
            placeholder="e.g. 30"
            style={{
              width: '100%', padding: '9px 12px', borderRadius: 8,
              border: '1px solid var(--line)', background: 'var(--surface-2)', fontSize: 14,
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{ padding: '9px 18px', borderRadius: 8, fontSize: 14, fontWeight: 600, color: 'var(--ink-2)', cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            style={{ padding: '9px 18px', borderRadius: 8, fontSize: 14, fontWeight: 600, background: 'var(--accent)', color: '#fff', cursor: 'pointer' }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx vitest run tests/component/ItemEditModal.test.tsx
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/ItemEditModal.tsx tests/component/ItemEditModal.test.tsx
git commit -m "feat: add ItemEditModal for text, priority, focusLevel, timeEstimate"
```

---

## Task 4: Update `ItemRow` and retire `EditPopover`

**Files:**
- Modify: `src/components/ItemRow.tsx`
- Modify: `tests/component/ItemRow.test.tsx`
- Delete: `src/components/EditPopover.tsx`
- Delete: `tests/component/EditPopover.test.tsx`

- [ ] **Step 1: Update the two edit-trigger tests in `tests/component/ItemRow.test.tsx`**

Replace the two failing tests (clicking text → inline input, committing edit → updates store) with:

```tsx
it('clicking item text opens the ItemEditModal', async () => {
  useStore.getState().addItem(frontId, { text: 'Original' })
  const item = useStore.getState().fronts[0].items[0]
  render(<ItemRow item={item} frontId={frontId} />)
  await userEvent.click(screen.getByText('Original'))
  expect(screen.getByRole('dialog', { name: 'Edit item' })).toBeInTheDocument()
})

it('saving in ItemEditModal updates item text in the store', async () => {
  useStore.getState().addItem(frontId, { text: 'Original' })
  const item = useStore.getState().fronts[0].items[0]
  render(<ItemRow item={item} frontId={frontId} />)
  await userEvent.click(screen.getByText('Original'))
  const input = screen.getByDisplayValue('Original')
  await userEvent.clear(input)
  await userEvent.type(input, 'Updated{Enter}')
  expect(useStore.getState().fronts[0].items[0].text).toBe('Updated')
})
```

- [ ] **Step 2: Run updated ItemRow tests to confirm the two new ones fail**

```bash
npx vitest run tests/component/ItemRow.test.tsx
```

Expected: the two replaced tests fail ("cannot find dialog 'Edit item'").

- [ ] **Step 3: Rewrite `ItemRow` to open `ItemEditModal` on text click**

Replace the full content of `src/components/ItemRow.tsx`:

```tsx
import { useState } from 'react'
import type { Item } from '@/types'
import { useStore } from '@/store'
import { Icon } from './ui/Icon'
import { hsl, tint } from '@/lib/ui'
import { CompletionModal } from './CompletionModal'
import { ItemEditModal } from './ItemEditModal'

interface ItemRowProps {
  item: Item
  frontId: string
  frontHue?: number
  isFirst?: boolean
  isLast?: boolean
  isNextMove?: boolean
}

export function ItemRow({
  item,
  frontId,
  frontHue = 256,
  isFirst = false,
  isLast = false,
  isNextMove = false,
}: ItemRowProps) {
  const [hover, setHover] = useState(false)
  const [completionOpen, setCompletionOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  const inProgress = item.status === 'in_progress'
  const energyHue: Record<string, number> = { deep: 256, medium: 220, light: 152 }
  const eHue = energyHue[item.focusLevel ?? 'medium'] ?? 220

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 14px',
        borderTop: isFirst ? 'none' : '1px solid var(--line-soft)',
        background: inProgress
          ? tint(frontHue, 96, 3)
          : isNextMove
            ? tint(frontHue, 97, 2)
            : hover
              ? 'var(--surface-2)'
              : 'transparent',
      }}
    >
      {/* Reorder arrows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, opacity: hover ? 1 : 0.32, transition: 'opacity .12s', flex: 'none' }}>
        <button
          onClick={() => useStore.getState().reorderItem(frontId, item.id, 'up')}
          disabled={isFirst}
          style={{ width: 20, height: 16, borderRadius: 4, color: isFirst ? 'var(--line)' : 'var(--ink-3)', display: 'grid', placeItems: 'center' }}
          aria-label="Move up"
        >
          <Icon name="arrow" size={12} style={{ transform: 'rotate(-90deg)' }} />
        </button>
        <button
          onClick={() => useStore.getState().reorderItem(frontId, item.id, 'down')}
          disabled={isLast}
          style={{ width: 20, height: 16, borderRadius: 4, color: isLast ? 'var(--line)' : 'var(--ink-3)', display: 'grid', placeItems: 'center' }}
          aria-label="Move down"
        >
          <Icon name="arrow" size={12} style={{ transform: 'rotate(90deg)' }} />
        </button>
      </div>

      {/* Status checkbox */}
      <button
        aria-label="Complete item"
        onClick={() => setCompletionOpen(true)}
        style={{ width: 20, height: 20, borderRadius: 6, flex: 'none', border: `1.8px solid ${hover ? hsl(frontHue, 56) : 'var(--line)'}`, background: 'var(--surface)', display: 'grid', placeItems: 'center', transition: 'all .12s', cursor: 'pointer' }}
      >
        {(hover || item.status !== 'open') && (
          <Icon name="check" size={13} style={{ color: hsl(frontHue, 56) }} stroke={2.4} />
        )}
      </button>

      {completionOpen && (
        <CompletionModal
          frontId={frontId}
          itemId={item.id}
          itemText={item.text}
          onClose={() => setCompletionOpen(false)}
        />
      )}

      {editOpen && (
        <ItemEditModal
          item={item}
          frontId={frontId}
          onClose={() => setEditOpen(false)}
        />
      )}

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: isNextMove || inProgress ? 650 : 500, letterSpacing: '-0.01em', lineHeight: 1.35 }}>
          {inProgress && (
            <span style={{ background: hsl(frontHue, 56), color: '#fff', padding: '2px 8px', borderRadius: 99, fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600, marginRight: 8, verticalAlign: '2px', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Icon name="timer" size={11} />In progress
            </span>
          )}
          {isNextMove && !inProgress && (
            <span style={{ background: hsl(frontHue, 56), color: '#fff', padding: '2px 8px', borderRadius: 99, fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600, marginRight: 8, verticalAlign: '2px', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Icon name="bolt" size={11} fill="#fff" stroke={0} />Next move
            </span>
          )}
          {!inProgress && !isNextMove && item.status === 'open' && (
            <span style={{ color: 'var(--ink-3)', fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600, marginRight: 8 }}>Open</span>
          )}
          <span
            onClick={() => setEditOpen(true)}
            style={{ cursor: 'text' }}
          >
            {item.text}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 7, marginTop: 6, flexWrap: 'wrap' }}>
          {item.timeEstimate && (
            <span className="chip" style={{ padding: '1px 8px', fontSize: 10.5 }}>
              <Icon name="clock" size={11} />{item.timeEstimate}m
            </span>
          )}
          {item.focusLevel && (
            <span className="chip" style={{ padding: '1px 8px', fontSize: 10.5, color: hsl(eHue, 44), background: tint(eHue, 96, 3), borderColor: tint(eHue, 89, 4) }}>
              {item.focusLevel}
            </span>
          )}
          {item.logs.length > 0 && (
            <span className="chip" style={{ padding: '1px 8px', fontSize: 10.5, color: hsl(frontHue, 44), background: tint(frontHue, 96, 3), borderColor: tint(frontHue, 89, 4) }}>
              <Icon name="task" size={10} />{item.logs.length} log{item.logs.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
        {item.logs.length > 0 && (
          <div style={{ fontSize: 12.5, color: 'var(--ink-2)', marginTop: 6, lineHeight: 1.4 }}>
            {item.logs[item.logs.length - 1].text}
          </div>
        )}
      </div>

      {/* Hover actions */}
      <div style={{ display: 'flex', gap: 4, alignItems: 'center', opacity: hover ? 1 : 0, transition: 'opacity .12s' }}>
        {item.status === 'open' && (
          <button
            onClick={() => useStore.getState().startItem(frontId, item.id)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600, color: 'var(--ink-2)' }}
          >
            <Icon name="play" size={14} /> Start
          </button>
        )}
        {item.status !== 'done' && (
          <button
            onClick={() => setCompletionOpen(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600, color: `oklch(0.56 0.12 152)`, background: `oklch(0.95 0.04 152 / 0.7)` }}
          >
            <Icon name="check" size={13} stroke={2.4} /> Done
          </button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run ItemRow tests**

```bash
npx vitest run tests/component/ItemRow.test.tsx
```

Expected: all tests pass.

- [ ] **Step 5: Delete retired files**

```bash
rm src/components/EditPopover.tsx
rm tests/component/EditPopover.test.tsx
```

- [ ] **Step 6: Check no other files import EditPopover**

```bash
grep -r "EditPopover" src/ tests/
```

Expected: no output (no remaining references).

- [ ] **Step 7: Run full test suite**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/components/ItemRow.tsx tests/component/ItemRow.test.tsx
git add -u src/components/EditPopover.tsx tests/component/EditPopover.test.tsx
git commit -m "refactor: replace EditPopover with ItemEditModal in ItemRow"
```

---

## Task 5: Wire `HomeView` hero card to global focus

**Files:**
- Modify: `src/views/HomeView.tsx`
- Modify: `tests/component/HomeView.test.tsx`

- [ ] **Step 1: Update HomeView tests**

Replace the existing `'renders hero front when scheduling returns one'` test and add global-focus tests. The full updated describe block in `tests/component/HomeView.test.tsx`:

```tsx
it('shows empty state when no active fronts', () => {
  renderWithRouter(<HomeView />)
  expect(screen.getByText('Nothing scheduled for today.')).toBeInTheDocument()
})

it('renders global focus item text in hero card when an open item exists', () => {
  useStore.getState().addFront(FRONT_DATA)
  const frontId = useStore.getState().fronts[0].id
  useStore.getState().addItem(frontId, { text: 'My focus task' })
  renderWithRouter(<HomeView />)
  expect(screen.getByText('Focus now')).toBeInTheDocument()
  expect(screen.getByText('My focus task')).toBeInTheDocument()
})

it('shows the front name as context in the hero card', () => {
  useStore.getState().addFront(FRONT_DATA)
  const frontId = useStore.getState().fronts[0].id
  useStore.getState().addItem(frontId, { text: 'Task' })
  renderWithRouter(<HomeView />)
  // front name "Alpha" appears in hero card as context
  expect(screen.getAllByText('Alpha').length).toBeGreaterThanOrEqual(1)
})

it('shows "All items complete" when front has no open items', () => {
  useStore.getState().addFront(FRONT_DATA)
  renderWithRouter(<HomeView />)
  expect(screen.getByText('All items complete!')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run to confirm new tests fail**

```bash
npx vitest run tests/component/HomeView.test.tsx
```

Expected: the `'renders global focus item text'` and `'shows front name as context'` tests fail.

- [ ] **Step 3: Update `src/views/HomeView.tsx`**

**3a.** Add imports at the top:

```ts
import { getGlobalFocusItem } from '@/lib/scheduling'
import type { FocusResult } from '@/lib/scheduling'
```

**3b.** Replace the `HeroCard` component signature and internals. Change:

```tsx
function HeroCard({ front }: { front: Front }) {
  const navigate = useNavigate()
  const hue = getFrontHue(front.color)
  const progress = getProgress(front)
  const nextItem = getNextItem(front)
  const isInProgress = front.items.some((i) => i.status === 'in_progress')
```

to:

```tsx
function HeroCard({ focus }: { focus: FocusResult }) {
  const { item: nextItem, front } = focus
  const navigate = useNavigate()
  const hue = getFrontHue(front.color)
  const progress = getProgress(front)
  const isInProgress = nextItem.status === 'in_progress'
```

**3c.** In the HeroCard JSX, add front-name context below the "Focus now" eyebrow. Replace:

```tsx
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 16 }}>
            <span className="eyebrow" style={{ color: hsl(hue, 44), display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span className="dot" style={{ background: hsl(hue, 56) }} />
              Focus now
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 14, flexWrap: 'wrap' }}>
            <Glyph front={front} size={34} />
            <span style={{ fontWeight: 600, fontSize: 15 }}>{front.name}</span>
          </div>
```

with:

```tsx
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 16 }}>
            <span className="eyebrow" style={{ color: hsl(hue, 44), display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span className="dot" style={{ background: hsl(hue, 56) }} />
              Focus now
            </span>
            <span style={{ fontSize: 12, color: 'var(--ink-3)', marginLeft: 4 }}>from</span>
            <Glyph front={front} size={16} />
            <span style={{ fontSize: 12, color: hsl(hue, 44), fontWeight: 600 }}>{front.name}</span>
          </div>
```

Remove the old `<div>` block with `Glyph` + `front.name` that came after (it's now inlined above). Delete these lines:

```tsx
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 14, flexWrap: 'wrap' }}>
            <Glyph front={front} size={34} />
            <span style={{ fontWeight: 600, fontSize: 15 }}>{front.name}</span>
          </div>
```

**3d.** Fix the Start button `onClick` — replace:

```tsx
onClick={() => useStore.getState().startItem(front.id, nextItem.id)}
```

with:

```tsx
onClick={() => useStore.getState().startItem(front.id, nextItem.id)}
```

(unchanged — `nextItem` and `front` are still in scope)

**3e.** In the `HomeView` function body, replace:

```tsx
  const { hero, scheduled, offDay, locked } = useScheduling()
  const captures = useStore((state) => state.captures)
  const allFronts = useStore((state) => state.fronts)
```

with:

```tsx
  const { scheduled, offDay, locked } = useScheduling()
  const captures = useStore((state) => state.captures)
  const allFronts = useStore((state) => state.fronts)
  const globalFocus = getGlobalFocusItem(allFronts, new Date())
```

**3f.** Replace the `onDeck` derivation. Change:

```tsx
  const onDeck = scheduled.filter((f) => f.id !== hero?.id)
```

to:

```tsx
  const onDeck = scheduled
```

**3g.** Replace the hero render line. Change:

```tsx
      {hero && <HeroCard front={hero} />}
```

to:

```tsx
      {globalFocus ? <HeroCard focus={globalFocus} /> : scheduled.length > 0 && (
        <div style={{ padding: '26px 28px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--line-soft)', marginBottom: 22, color: 'var(--ink-3)', fontSize: 15 }}>
          All items complete!
        </div>
      )}
```

**3h.** `getNextItem` remains in the file — `FrontCard` still uses it to show each front's own next item. No change needed here.

- [ ] **Step 4: Run HomeView tests**

```bash
npx vitest run tests/component/HomeView.test.tsx
```

Expected: all tests pass.

- [ ] **Step 5: Run full test suite**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/views/HomeView.tsx tests/component/HomeView.test.tsx
git commit -m "feat: wire HomeView hero card to getGlobalFocusItem"
```

---

## Done

All five tasks complete. Verify the full suite one last time:

```bash
npx vitest run
```

Expected: all tests pass with no TypeScript errors (`npx tsc --noEmit` should also be clean).
