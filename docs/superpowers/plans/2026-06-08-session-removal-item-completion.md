# Session Removal & Item Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the session abstraction entirely, replace it with a direct `startItem` store action and a remarks popover on completion.

**Architecture:** The session slice, `SessionBar`, and `useSession` are deleted. Item status drives all UI state: `in_progress` is set by a new `startItem` action; `done` is set via a new `CompletionPopover` component that collects optional remarks before committing. Multiple items can be `in_progress` simultaneously.

**Tech Stack:** React 19, Zustand 5, Vitest + Testing Library (unit/component), Playwright (e2e + MCP browser tools for smoke test)

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `src/store/types.ts` | Add `startItem` to `ItemsSlice`; remove `SessionSlice` |
| Modify | `src/store/slices/items.ts` | Add `startItem` action |
| Modify | `src/store/index.ts` | Remove session slice wiring |
| **Delete** | `src/store/slices/session.ts` | Entire file |
| **Delete** | `src/hooks/useSession.ts` | Entire file |
| **Delete** | `src/components/SessionBar.tsx` | Entire file |
| Modify | `src/types/index.ts` | Remove `Session` interface |
| **Create** | `src/components/CompletionPopover.tsx` | Remarks input + mark-done action |
| Modify | `src/components/ItemRow.tsx` | Remove session props; wire `CompletionPopover` |
| Modify | `src/views/DetailView.tsx` | Remove session state; update `ItemRow` usage |
| Modify | `src/views/HomeView.tsx` | Replace session checks with `item.status` checks |
| Modify | `src/App.tsx` | Remove `SessionBar` |
| Modify | `tests/unit/store.test.ts` | Remove session describe; add `startItem` tests |
| Modify | `tests/unit/hooks.test.ts` | Remove `useSession` describe |
| Modify | `tests/component/utils.tsx` | Remove `session: null` from `resetStore` |
| **Delete** | `tests/component/SessionBar.test.tsx` | Entire file |
| Modify | `tests/component/ItemRow.test.tsx` | Update for new props + popover behavior |
| **Create** | `tests/component/CompletionPopover.test.tsx` | Component tests |
| Modify | `tests/e2e/flows.spec.ts` | Rewrite Flow 3 & 4 without session |

---

## Task 1: Add `startItem` to the items store

**Files:**
- Modify: `src/store/types.ts`
- Modify: `src/store/slices/items.ts`
- Modify: `tests/unit/store.test.ts`

- [ ] **Step 1: Write failing tests for `startItem`**

Add at the end of the `describe('items', ...)` block in `tests/unit/store.test.ts`:

```ts
it('startItem sets status to in_progress and stamps startedAt', () => {
  useStore.getState().addItem(frontId, { text: 'Work' })
  const itemId = useStore.getState().fronts[0].items[0].id
  useStore.getState().startItem(frontId, itemId)
  const item = useStore.getState().fronts[0].items[0]
  expect(item.status).toBe('in_progress')
  expect(item.startedAt).toBeDefined()
})

it('startItem on a nonexistent item is a no-op', () => {
  useStore.getState().startItem(frontId, 'nonexistent')
  expect(useStore.getState().fronts[0].items).toHaveLength(0)
})

it('startItem on multiple items — all can be in_progress simultaneously', () => {
  useStore.getState().addItem(frontId, { text: 'A' })
  useStore.getState().addItem(frontId, { text: 'B' })
  const [a, b] = useStore.getState().fronts[0].items
  useStore.getState().startItem(frontId, a.id)
  useStore.getState().startItem(frontId, b.id)
  const items = useStore.getState().fronts[0].items
  expect(items.every((i) => i.status === 'in_progress')).toBe(true)
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run tests/unit/store.test.ts
```
Expected: 3 failures referencing `startItem is not a function`.

- [ ] **Step 3: Add `startItem` to `ItemsSlice` in `src/store/types.ts`**

```ts
export type ItemsSlice = {
  addItem: (frontId: string, data: Pick<Item, 'text' | 'focusLevel' | 'timeEstimate'>) => void
  updateItem: (frontId: string, itemId: string, updates: Partial<Omit<Item, 'id' | 'createdAt'>>) => void
  reorderItem: (frontId: string, itemId: string, direction: 'up' | 'down') => void
  addLog: (frontId: string, itemId: string, text: string) => void
  startItem: (frontId: string, itemId: string) => void
}
```

- [ ] **Step 4: Implement `startItem` in `src/store/slices/items.ts`**

Add after `addLog`:

```ts
startItem: (frontId, itemId) =>
  set((state) => ({
    fronts: state.fronts.map((f) => {
      if (f.id !== frontId) return f
      return {
        ...f,
        items: f.items.map((item) =>
          item.id === itemId
            ? { ...item, status: 'in_progress' as const, startedAt: new Date().toISOString() }
            : item
        ),
      }
    }),
  })),
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
npx vitest run tests/unit/store.test.ts
```
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/store/types.ts src/store/slices/items.ts tests/unit/store.test.ts
git commit -m "feat: add startItem store action — sets in_progress and stamps startedAt"
```

---

## Task 2: Create `CompletionPopover` component (TDD)

**Files:**
- Create: `src/components/CompletionPopover.tsx`
- Create: `tests/component/CompletionPopover.test.tsx`

- [ ] **Step 1: Write failing component tests**

Create `tests/component/CompletionPopover.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CompletionPopover } from '@/components/CompletionPopover'
import { useStore } from '@/store'
import { resetStore } from './utils'

const FRONT_DATA = {
  name: 'F', type: 'project' as const, color: '256', status: 'active' as const,
  cadence: { days: [] as number[] }, prerequisites: [] as string[],
}

describe('CompletionPopover', () => {
  let frontId: string
  let itemId: string

  beforeEach(() => {
    resetStore()
    useStore.getState().addFront(FRONT_DATA)
    frontId = useStore.getState().fronts[0].id
    useStore.getState().addItem(frontId, { text: 'Task' })
    itemId = useStore.getState().fronts[0].items[0].id
  })

  it('renders a dialog with Remarks input and Mark done button', () => {
    render(<CompletionPopover frontId={frontId} itemId={itemId} onClose={vi.fn()} />)
    expect(screen.getByRole('dialog', { name: 'Complete item' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Remarks (optional)')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mark done' })).toBeInTheDocument()
  })

  it('Mark done marks item as done with doneAt', async () => {
    render(<CompletionPopover frontId={frontId} itemId={itemId} onClose={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Mark done' }))
    const item = useStore.getState().fronts[0].items[0]
    expect(item.status).toBe('done')
    expect(item.doneAt).toBeDefined()
  })

  it('Mark done with remarks creates a log entry', async () => {
    render(<CompletionPopover frontId={frontId} itemId={itemId} onClose={vi.fn()} />)
    await userEvent.type(screen.getByPlaceholderText('Remarks (optional)'), 'Shipped it')
    await userEvent.click(screen.getByRole('button', { name: 'Mark done' }))
    const item = useStore.getState().fronts[0].items[0]
    expect(item.logs).toHaveLength(1)
    expect(item.logs[0].text).toBe('Shipped it')
  })

  it('Mark done without remarks creates no log entry', async () => {
    render(<CompletionPopover frontId={frontId} itemId={itemId} onClose={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Mark done' }))
    expect(useStore.getState().fronts[0].items[0].logs).toHaveLength(0)
  })

  it('Enter key submits and marks item done', async () => {
    render(<CompletionPopover frontId={frontId} itemId={itemId} onClose={vi.fn()} />)
    await userEvent.type(screen.getByPlaceholderText('Remarks (optional)'), 'Done{Enter}')
    expect(useStore.getState().fronts[0].items[0].status).toBe('done')
  })

  it('Cancel button calls onClose without changing item status', async () => {
    const onClose = vi.fn()
    render(<CompletionPopover frontId={frontId} itemId={itemId} onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalledOnce()
    expect(useStore.getState().fronts[0].items[0].status).toBe('open')
  })

  it('Escape key calls onClose without changing item status', async () => {
    const onClose = vi.fn()
    render(<CompletionPopover frontId={frontId} itemId={itemId} onClose={onClose} />)
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledOnce()
    expect(useStore.getState().fronts[0].items[0].status).toBe('open')
  })

  it('Mark done calls onClose', async () => {
    const onClose = vi.fn()
    render(<CompletionPopover frontId={frontId} itemId={itemId} onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: 'Mark done' }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run tests/component/CompletionPopover.test.tsx
```
Expected: all fail — `CompletionPopover` does not exist yet.

- [ ] **Step 3: Create `src/components/CompletionPopover.tsx`**

```tsx
import { useState, useRef, useEffect } from 'react'
import { useStore } from '@/store'

interface CompletionPopoverProps {
  frontId: string
  itemId: string
  onClose: () => void
}

export function CompletionPopover({ frontId, itemId, onClose }: CompletionPopoverProps) {
  const [remarks, setRemarks] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  function confirm() {
    const store = useStore.getState()
    store.updateItem(frontId, itemId, { status: 'done', doneAt: new Date().toISOString() })
    if (remarks.trim()) {
      store.addLog(frontId, itemId, remarks.trim())
    }
    onClose()
  }

  return (
    <div
      role="dialog"
      aria-label="Complete item"
      style={{
        position: 'absolute',
        top: '100%',
        left: 0,
        zIndex: 50,
        marginTop: 6,
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 12,
        padding: '12px 14px',
        boxShadow: 'var(--shadow-3)',
        width: 280,
      }}
    >
      <input
        ref={inputRef}
        value={remarks}
        onChange={(e) => setRemarks(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') confirm()
          if (e.key === 'Escape') onClose()
        }}
        placeholder="Remarks (optional)"
        style={{
          width: '100%',
          border: '1px solid var(--line)',
          borderRadius: 8,
          padding: '8px 10px',
          fontSize: 13,
          background: 'var(--surface-2)',
          color: 'var(--ink)',
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />
      <div style={{ display: 'flex', gap: 6, marginTop: 10, justifyContent: 'flex-end' }}>
        <button
          onClick={onClose}
          style={{ padding: '6px 12px', borderRadius: 8, fontSize: 12.5, fontWeight: 600, color: 'var(--ink-3)' }}
        >
          Cancel
        </button>
        <button
          onClick={confirm}
          style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12.5, fontWeight: 600, background: 'var(--accent)', color: '#fff' }}
        >
          Mark done
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx vitest run tests/component/CompletionPopover.test.tsx
```
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/CompletionPopover.tsx tests/component/CompletionPopover.test.tsx
git commit -m "feat: add CompletionPopover component with optional remarks"
```

---

## Task 3: Remove session — store, types, components, tests (all at once)

**Files:**
- Delete: `src/store/slices/session.ts`
- Delete: `src/hooks/useSession.ts`
- Delete: `src/components/SessionBar.tsx`
- Delete: `tests/component/SessionBar.test.tsx`
- Modify: `src/types/index.ts`
- Modify: `src/store/types.ts`
- Modify: `src/store/index.ts`
- Modify: `src/App.tsx`
- Modify: `tests/unit/store.test.ts`
- Modify: `tests/unit/hooks.test.ts`
- Modify: `tests/component/utils.tsx`

- [ ] **Step 1: Remove `Session` interface from `src/types/index.ts`**

Delete lines 59–65 (the `Session` interface):
```ts
export interface Session {
  frontId: string
  itemId: string
  startedAt: string
  elapsed: number       // seconds
  paused: boolean
}
```

The file should end after the `Capture` interface.

- [ ] **Step 2: Remove `SessionSlice` from `src/store/types.ts`**

Replace the entire file with:

```ts
import type { Front, Capture, Item } from '@/types'

export type FrontsSlice = {
  fronts: Front[]
  addFront: (data: Omit<Front, 'id' | 'createdAt' | 'items'>) => string
  updateFront: (id: string, updates: Partial<Omit<Front, 'id' | 'createdAt'>>) => void
  deleteFront: (id: string) => void
}

export type ItemsSlice = {
  addItem: (frontId: string, data: Pick<Item, 'text' | 'focusLevel' | 'timeEstimate'>) => void
  updateItem: (frontId: string, itemId: string, updates: Partial<Omit<Item, 'id' | 'createdAt'>>) => void
  reorderItem: (frontId: string, itemId: string, direction: 'up' | 'down') => void
  addLog: (frontId: string, itemId: string, text: string) => void
  startItem: (frontId: string, itemId: string) => void
}

export type CapturesSlice = {
  captures: Capture[]
  addCapture: (data: Pick<Capture, 'text' | 'type'>) => void
  fileCapture: (captureId: string, frontId: string) => void
  deleteCapture: (captureId: string) => void
}

export type AppStore = FrontsSlice & ItemsSlice & CapturesSlice
```

- [ ] **Step 3: Remove session slice from `src/store/index.ts`**

Replace the entire file with:

```ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createFrontsSlice } from './slices/fronts'
import { createItemsSlice } from './slices/items'
import { createCapturesSlice } from './slices/captures'
import type { AppStore } from './types'

export const useStore = create<AppStore>()(
  persist(
    (...args) => ({
      ...createFrontsSlice(...args),
      ...createItemsSlice(...args),
      ...createCapturesSlice(...args),
    }),
    {
      name: 'command-v1',
      partialize: (state) => ({
        fronts: state.fronts,
        captures: state.captures,
      }),
    }
  )
)
```

- [ ] **Step 4: Delete the session slice file**

```bash
rm src/store/slices/session.ts
```

- [ ] **Step 5: Delete session hooks and component files**

```bash
rm src/hooks/useSession.ts
rm src/components/SessionBar.tsx
rm tests/component/SessionBar.test.tsx
```

- [ ] **Step 6: Remove `SessionBar` from `src/App.tsx`**

Replace the entire file with:

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Sidebar } from '@/components/Sidebar'
import { CaptureModal } from '@/components/CaptureModal'
import { HomeView } from '@/views/HomeView'
import { DetailView } from '@/views/DetailView'
import { ReviewView } from '@/views/ReviewView'
import { useCapture } from '@/hooks/useCapture'
import { Icon } from '@/components/ui/Icon'

function AppLayout() {
  const { open, openCapture, closeCapture } = useCapture()
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="app-main scroll">
        <Routes>
          <Route path="/" element={<HomeView />} />
          <Route path="/front/:id" element={<DetailView />} />
          <Route path="/review" element={<ReviewView />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {!open && (
        <button
          onClick={openCapture}
          title="Capture (C)"
          style={{
            position: 'fixed',
            right: 26,
            bottom: 26,
            zIndex: 40,
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            padding: '13px 18px',
            borderRadius: 14,
            background: 'var(--accent)',
            color: '#fff',
            fontWeight: 650,
            fontSize: 14,
            boxShadow: 'var(--shadow-3)',
          }}
        >
          <Icon name="bolt" size={17} />
          Capture
          <span
            className="kbd"
            style={{ background: 'rgba(255,255,255,.2)', border: 'none', color: '#fff', boxShadow: 'none' }}
          >
            C
          </span>
        </button>
      )}

      <CaptureModal open={open} onClose={closeCapture} />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  )
}
```

- [ ] **Step 7: Update `tests/component/utils.tsx` — remove `session: null`**

Replace:
```ts
export function resetStore() {
  useStore.setState({ fronts: [], captures: [], session: null })
}
```
With:
```ts
export function resetStore() {
  useStore.setState({ fronts: [], captures: [] })
}
```

- [ ] **Step 8: Remove session describe block from `tests/unit/store.test.ts`**

Delete the entire `describe('session', ...)` block (lines 236–330).

Also update the persistence describe block — replace the two session-related tests with a single cleaner one. Replace:

```ts
it('does NOT persist session to localStorage', () => {
  useStore.getState().addFront(FRONT_DATA)
  const frontId = useStore.getState().fronts[0].id
  useStore.getState().addItem(frontId, { text: 'item' })
  const itemId = useStore.getState().fronts[0].items[0].id
  useStore.getState().startSession(frontId, itemId)
  const parsed = JSON.parse(localStorage.getItem('command-v1')!)
  expect(parsed.state.session).toBeUndefined()
})

it('localStorage payload has correct Zustand persist format', () => {
  useStore.getState().addFront({ ...FRONT_DATA, name: 'Persist check' })
  const parsed = JSON.parse(localStorage.getItem('command-v1')!)
  expect(parsed).toHaveProperty('state')
  expect(parsed.state).toHaveProperty('fronts')
  expect(parsed.state).toHaveProperty('captures')
  expect(parsed.state).not.toHaveProperty('session')
  expect(parsed.state.fronts[0].name).toBe('Persist check')
})
```

With:

```ts
it('localStorage payload has correct Zustand persist format', () => {
  useStore.getState().addFront({ ...FRONT_DATA, name: 'Persist check' })
  const parsed = JSON.parse(localStorage.getItem('command-v1')!)
  expect(parsed).toHaveProperty('state')
  expect(parsed.state).toHaveProperty('fronts')
  expect(parsed.state).toHaveProperty('captures')
  expect(parsed.state.fronts[0].name).toBe('Persist check')
})
```

- [ ] **Step 9: Remove `useSession` describe block from `tests/unit/hooks.test.ts`**

Delete the entire `describe('useSession (timer tick)', ...)` block (lines 77–119).

Also remove these imports from the top of the file:
```ts
import { useSession } from '@/hooks/useSession'
```
and the `afterEach` that references session:
```ts
afterEach(() => {
  vi.useRealTimers()
  useStore.setState({ fronts: [], captures: [], session: null })
})
```

The file should only contain the `useCapture` describe block.

- [ ] **Step 10: Run all tests to confirm green**

```bash
npx vitest run
```
Expected: all passing (session tests deleted, not failing).

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "refactor: remove session abstraction — store, hooks, components, tests"
```

---

## Task 4: Refactor `ItemRow`

**Files:**
- Modify: `src/components/ItemRow.tsx`
- Modify: `tests/component/ItemRow.test.tsx`

- [ ] **Step 1: Update `ItemRow` tests first**

Replace the entire `tests/component/ItemRow.test.tsx` with:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ItemRow } from '@/components/ItemRow'
import { useStore } from '@/store'
import { resetStore } from './utils'

const FRONT_DATA = {
  name: 'F', type: 'project' as const, color: '256', status: 'active' as const,
  cadence: { days: [] as number[] }, prerequisites: [] as string[],
}

describe('ItemRow', () => {
  let frontId: string

  beforeEach(() => {
    resetStore()
    useStore.getState().addFront(FRONT_DATA)
    frontId = useStore.getState().fronts[0].id
  })

  it('renders item text', () => {
    useStore.getState().addItem(frontId, { text: 'Do something' })
    const item = useStore.getState().fronts[0].items[0]
    render(<ItemRow item={item} frontId={frontId} />)
    expect(screen.getByText('Do something')).toBeInTheDocument()
  })

  it('renders the Open status badge for open items', () => {
    useStore.getState().addItem(frontId, { text: 'T' })
    const item = useStore.getState().fronts[0].items[0]
    render(<ItemRow item={item} frontId={frontId} isFirst isLast />)
    expect(screen.getByText('Open')).toBeInTheDocument()
  })

  it('renders In progress badge for in_progress items', () => {
    useStore.getState().addItem(frontId, { text: 'T' })
    const itemId = useStore.getState().fronts[0].items[0].id
    useStore.getState().startItem(frontId, itemId)
    const item = useStore.getState().fronts[0].items[0]
    render(<ItemRow item={item} frontId={frontId} />)
    expect(screen.getByText('In progress')).toBeInTheDocument()
  })

  it('clicking checkbox on open item opens CompletionPopover', async () => {
    useStore.getState().addItem(frontId, { text: 'T' })
    const item = useStore.getState().fronts[0].items[0]
    render(<ItemRow item={item} frontId={frontId} />)
    await userEvent.click(screen.getByLabelText('Complete item'))
    expect(screen.getByRole('dialog', { name: 'Complete item' })).toBeInTheDocument()
  })

  it('clicking checkbox on in_progress item opens CompletionPopover', async () => {
    useStore.getState().addItem(frontId, { text: 'T' })
    const itemId = useStore.getState().fronts[0].items[0].id
    useStore.getState().startItem(frontId, itemId)
    const item = useStore.getState().fronts[0].items[0]
    render(<ItemRow item={item} frontId={frontId} />)
    await userEvent.click(screen.getByLabelText('Complete item'))
    expect(screen.getByRole('dialog', { name: 'Complete item' })).toBeInTheDocument()
  })

  it('clicking ↑ reorders the item upward', async () => {
    useStore.getState().addItem(frontId, { text: 'First' })
    useStore.getState().addItem(frontId, { text: 'Second' })
    const sorted = [...useStore.getState().fronts[0].items].sort((a, b) => a.order - b.order)
    const secondItem = sorted[1]
    render(<ItemRow item={secondItem} frontId={frontId} />)
    await userEvent.click(screen.getByLabelText('Move up'))
    const reordered = [...useStore.getState().fronts[0].items].sort((a, b) => a.order - b.order)
    expect(reordered[0].id).toBe(secondItem.id)
  })

  it('clicking ↓ reorders the item downward', async () => {
    useStore.getState().addItem(frontId, { text: 'First' })
    useStore.getState().addItem(frontId, { text: 'Second' })
    const sorted = [...useStore.getState().fronts[0].items].sort((a, b) => a.order - b.order)
    const firstItem = sorted[0]
    render(<ItemRow item={firstItem} frontId={frontId} />)
    await userEvent.click(screen.getByLabelText('Move down'))
    const reordered = [...useStore.getState().fronts[0].items].sort((a, b) => a.order - b.order)
    expect(reordered[1].id).toBe(firstItem.id)
  })

  it('clicking item text shows edit input', async () => {
    useStore.getState().addItem(frontId, { text: 'Original' })
    const item = useStore.getState().fronts[0].items[0]
    render(<ItemRow item={item} frontId={frontId} />)
    await userEvent.click(screen.getByText('Original'))
    expect(screen.getByDisplayValue('Original')).toBeInTheDocument()
  })

  it('committing edit updates item text in the store', async () => {
    useStore.getState().addItem(frontId, { text: 'Original' })
    const item = useStore.getState().fronts[0].items[0]
    render(<ItemRow item={item} frontId={frontId} />)
    await userEvent.click(screen.getByText('Original'))
    const input = screen.getByDisplayValue('Original')
    await userEvent.clear(input)
    await userEvent.type(input, 'Updated{Enter}')
    expect(useStore.getState().fronts[0].items[0].text).toBe('Updated')
  })

  it('Start button calls startItem on the store', async () => {
    useStore.getState().addItem(frontId, { text: 'T' })
    const item = useStore.getState().fronts[0].items[0]
    render(<ItemRow item={item} frontId={frontId} />)
    await userEvent.click(screen.getByText('Start'))
    const updated = useStore.getState().fronts[0].items[0]
    expect(updated.status).toBe('in_progress')
    expect(updated.startedAt).toBeDefined()
  })

  it('Start button is not shown for in_progress items', () => {
    useStore.getState().addItem(frontId, { text: 'T' })
    const itemId = useStore.getState().fronts[0].items[0].id
    useStore.getState().startItem(frontId, itemId)
    const item = useStore.getState().fronts[0].items[0]
    render(<ItemRow item={item} frontId={frontId} />)
    expect(screen.queryByText('Start')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to confirm the new ones fail**

```bash
npx vitest run tests/component/ItemRow.test.tsx
```
Expected: new tests fail because `ItemRow` still has old interface.

- [ ] **Step 3: Rewrite `src/components/ItemRow.tsx`**

Replace the entire file with:

```tsx
import { useState } from 'react'
import type { Item } from '@/types'
import { useStore } from '@/store'
import { Icon } from './ui/Icon'
import { hsl, tint } from '@/lib/ui'
import { CompletionPopover } from './CompletionPopover'

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
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(item.text)
  const [popoverOpen, setPopoverOpen] = useState(false)

  const inProgress = item.status === 'in_progress'
  const energyHue: Record<string, number> = { deep: 256, medium: 220, light: 152 }
  const eHue = energyHue[item.focusLevel ?? 'medium'] ?? 220

  function commitEdit() {
    const trimmed = editText.trim()
    if (trimmed && trimmed !== item.text) {
      useStore.getState().updateItem(frontId, item.id, { text: trimmed })
    }
    setEditing(false)
  }

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

      {/* Toggle checkbox */}
      <div style={{ position: 'relative', flex: 'none' }}>
        <button
          onClick={() => setPopoverOpen(true)}
          style={{ width: 20, height: 20, borderRadius: 6, flex: 'none', border: `1.8px solid ${hover ? hsl(frontHue, 56) : 'var(--line)'}`, background: 'var(--surface)', display: 'grid', placeItems: 'center', transition: 'all .12s' }}
          aria-label="Complete item"
        >
          {(hover || item.status !== 'open') && (
            <Icon name="check" size={13} style={{ color: hsl(frontHue, 56) }} stroke={2.4} />
          )}
        </button>
        {popoverOpen && (
          <CompletionPopover
            frontId={frontId}
            itemId={item.id}
            onClose={() => setPopoverOpen(false)}
          />
        )}
      </div>

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
          {editing ? (
            <input
              autoFocus
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitEdit()
                if (e.key === 'Escape') { setEditText(item.text); setEditing(false) }
              }}
              onBlur={commitEdit}
              style={{ border: 'none', outline: '1px solid var(--accent)', borderRadius: 4, padding: '1px 4px', fontSize: 14, fontWeight: 500, background: 'var(--surface-2)', width: '100%' }}
            />
          ) : (
            <span onClick={() => { setEditText(item.text); setEditing(true) }} style={{ cursor: 'text' }}>{item.text}</span>
          )}
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
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx vitest run tests/component/ItemRow.test.tsx
```
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/ItemRow.tsx tests/component/ItemRow.test.tsx
git commit -m "refactor: update ItemRow — remove session props, wire CompletionPopover and startItem"
```

---

## Task 5: Update `DetailView`

**Files:**
- Modify: `src/views/DetailView.tsx`

- [ ] **Step 1: Remove session from `DetailView`**

In `src/views/DetailView.tsx`, make these changes:

1. Remove the session import line:
```ts
const session = useStore((state) => state.session)
```

2. Remove the `handleStartSession` function:
```ts
function handleStartSession(itemId: string) {
  useStore.getState().startSession(front!.id, itemId)
}
```

3. Update each `ItemRow` usage — remove `inProgress`, `sessionActive`, and `onStartSession` props. Before:
```tsx
<ItemRow
  key={item.id}
  item={item}
  frontId={front.id}
  frontHue={hue}
  isFirst={i === 0}
  isLast={i === openItems.length - 1}
  isNextMove={i === 0}
  inProgress={session?.itemId === item.id}
  sessionActive={!!session}
  onStartSession={handleStartSession}
/>
```
After:
```tsx
<ItemRow
  key={item.id}
  item={item}
  frontId={front.id}
  frontHue={hue}
  isFirst={i === 0}
  isLast={i === openItems.length - 1}
  isNextMove={i === 0}
/>
```

4. Update the hint text. Replace:
```tsx
<span style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>reorder with ↑ ↓ · click start to begin a session</span>
```
With:
```tsx
<span style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>reorder with ↑ ↓ · Start to begin · ✓ to complete</span>
```

- [ ] **Step 2: Run all tests**

```bash
npx vitest run
```
Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add src/views/DetailView.tsx
git commit -m "refactor: remove session from DetailView"
```

---

## Task 6: Update `HomeView`

**Files:**
- Modify: `src/views/HomeView.tsx`

`HomeView` has two components that reference session: `HeroCard` and `FrontCard`.

- [ ] **Step 1: Update `HeroCard` in `src/views/HomeView.tsx`**

In `HeroCard`, replace:
```ts
const session = useStore((s) => s.session)
const isInProgress = session?.frontId === front.id
```
With:
```ts
const isInProgress = front.items.some((i) => i.status === 'in_progress')
const nextOpenItem = front.items.find((i) => i.status === 'open')
```

Replace the button block:
```tsx
{isInProgress ? (
  <button onClick={() => navigate(`/front/${front.id}`)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 20px', borderRadius: 10, fontSize: 15, fontWeight: 600, background: 'var(--surface)', color: 'var(--ink)', border: '1px solid var(--line)', boxShadow: 'var(--shadow-1)' }}>
    <Icon name="timer" size={17} /> Session running…
  </button>
) : nextItem ? (
  <button
    onClick={() => useStore.getState().startSession(front.id, nextItem.id)}
    style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 20px', borderRadius: 10, fontSize: 15, fontWeight: 600, background: 'var(--accent)', color: '#fff', boxShadow: 'var(--shadow-1)' }}
  >
    <Icon name="play" size={17} /> Start a session
  </button>
) : null}
{nextItem && !isInProgress && (
  <button
    onClick={() => useStore.getState().updateItem(front.id, nextItem.id, { status: 'done', doneAt: new Date().toISOString() })}
    style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 20px', borderRadius: 10, fontSize: 15, fontWeight: 600, background: 'var(--surface)', color: 'var(--ink)', border: '1px solid var(--line)', boxShadow: 'var(--shadow-1)' }}
  >
    <Icon name="check" size={17} /> Mark done
  </button>
)}
```
With:
```tsx
{nextOpenItem && !isInProgress && (
  <button
    onClick={() => useStore.getState().startItem(front.id, nextOpenItem.id)}
    style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 20px', borderRadius: 10, fontSize: 15, fontWeight: 600, background: 'var(--accent)', color: '#fff', boxShadow: 'var(--shadow-1)' }}
  >
    <Icon name="play" size={17} /> Start
  </button>
)}
{isInProgress && (
  <button onClick={() => navigate(`/front/${front.id}`)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 20px', borderRadius: 10, fontSize: 15, fontWeight: 600, background: 'var(--surface)', color: 'var(--ink)', border: '1px solid var(--line)', boxShadow: 'var(--shadow-1)' }}>
    <Icon name="timer" size={17} /> In progress…
  </button>
)}
```

Also remove the now-unused `nextItem` variable (the `getNextItem` call and its usage in this component):
```ts
const nextItem = getNextItem(front)
```
Replace with the already-defined `nextOpenItem` above.

Update the display text from `nextItem?.text` to `nextOpenItem?.text`:
```tsx
{nextOpenItem?.text || 'All items complete!'}
```

- [ ] **Step 2: Update `FrontCard` in `src/views/HomeView.tsx`**

In `FrontCard`, replace:
```ts
const session = useStore((s) => s.session)
const isInProgress = session?.frontId === front.id
```
With:
```ts
const isInProgress = front.items.some((i) => i.status === 'in_progress')
```

Replace the actions block:
```tsx
{isInProgress ? (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 11px', borderRadius: 10, fontSize: 12.5, fontWeight: 600, color: hsl(hue, 42), background: tint(hue, 96, 3), border: `1px solid ${tint(hue, 84, 6)}` }}>
    <Icon name="timer" size={15} /> Running…
  </span>
) : nextItem ? (
  <>
    <button
      onClick={() => useStore.getState().startSession(front.id, nextItem.id)}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 11px', borderRadius: 10, fontSize: 12.5, fontWeight: 600, background: 'var(--accent)', color: '#fff', boxShadow: 'var(--shadow-1)' }}
    >
      <Icon name="play" size={15} /> Start
    </button>
    <button
      onClick={() => useStore.getState().updateItem(front.id, nextItem.id, { status: 'done', doneAt: new Date().toISOString() })}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 11px', borderRadius: 10, fontSize: 12.5, fontWeight: 600, color: 'var(--ink-2)' }}
    >
      <Icon name="check" size={15} /> Done
    </button>
  </>
) : null}
```
With:
```tsx
{isInProgress ? (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 11px', borderRadius: 10, fontSize: 12.5, fontWeight: 600, color: hsl(hue, 42), background: tint(hue, 96, 3), border: `1px solid ${tint(hue, 84, 6)}` }}>
    <Icon name="timer" size={15} /> In progress…
  </span>
) : nextItem ? (
  <button
    onClick={() => useStore.getState().startItem(front.id, nextItem.id)}
    style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 11px', borderRadius: 10, fontSize: 12.5, fontWeight: 600, background: 'var(--accent)', color: '#fff', boxShadow: 'var(--shadow-1)' }}
  >
    <Icon name="play" size={15} /> Start
  </button>
) : null}
```

- [ ] **Step 3: Run all tests**

```bash
npx vitest run
```
Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add src/views/HomeView.tsx
git commit -m "refactor: replace session checks in HomeView with item.status === in_progress"
```

---

## Task 7: Update e2e tests

**Files:**
- Modify: `tests/e2e/flows.spec.ts`

- [ ] **Step 1: Rewrite Flow 3 — start item and complete with remark**

Replace the existing Flow 3 test with:

```ts
// ── Flow 3: Start item, complete with remark ────────────────────────────────

test('start item marks in_progress; complete with remark appears in done list', async ({ page }) => {
  await page.goto('/')

  await page.getByText('+ New Front').click()
  await page.getByPlaceholder('Front name').fill('Work Front')
  await page.getByText('Create').click()

  await page.getByRole('link', { name: 'Work Front' }).click()

  await page.getByText('+ Add item').click()
  await page.getByPlaceholder('New item…').fill('Important task')
  await page.keyboard.press('Enter')

  // Start marks item as in_progress — no session bar
  await page.getByText('Start').click()
  await expect(page.getByText('In progress')).toBeVisible()
  await expect(page.getByRole('status')).not.toBeVisible()

  // Checkbox opens CompletionPopover
  await page.getByLabel('Complete item').click()
  await expect(page.getByRole('dialog', { name: 'Complete item' })).toBeVisible()

  // Type remark and confirm
  await page.getByPlaceholder('Remarks (optional)').fill('Wrapped up nicely')
  await page.getByRole('button', { name: 'Mark done' }).click()

  // Item is now done with log text visible
  await expect(page.getByText('Done · 1')).toBeVisible()
  await expect(page.getByText('Wrapped up nicely')).toBeVisible()
})

test('completing item without remark creates no log entry', async ({ page }) => {
  await page.goto('/')

  await page.getByText('+ New Front').click()
  await page.getByPlaceholder('Front name').fill('Front B')
  await page.getByText('Create').click()
  await page.getByRole('link', { name: 'Front B' }).click()

  await page.getByText('+ Add item').click()
  await page.getByPlaceholder('New item…').fill('Quick task')
  await page.keyboard.press('Enter')

  await page.getByLabel('Complete item').click()
  await page.getByRole('button', { name: 'Mark done' }).click()

  await expect(page.getByText('Done · 1')).toBeVisible()
  // No log chip should appear on the done item
  await expect(page.getByText('0 logs')).not.toBeVisible()
})

test('dismissing completion popover leaves item unchanged', async ({ page }) => {
  await page.goto('/')

  await page.getByText('+ New Front').click()
  await page.getByPlaceholder('Front name').fill('Front C')
  await page.getByText('Create').click()
  await page.getByRole('link', { name: 'Front C' }).click()

  await page.getByText('+ Add item').click()
  await page.getByPlaceholder('New item…').fill('Undecided task')
  await page.keyboard.press('Enter')

  await page.getByLabel('Complete item').click()
  await expect(page.getByRole('dialog', { name: 'Complete item' })).toBeVisible()
  await page.getByRole('button', { name: 'Cancel' }).click()

  // Item still visible as open — no done section
  await expect(page.getByText('Undecided task')).toBeVisible()
  await expect(page.getByText('Done · 1')).not.toBeVisible()
})
```

- [ ] **Step 2: Rewrite Flow 4 — review page uses new completion flow**

Replace the existing Flow 4 test:

```ts
// ── Flow 4: Weekly review ───────────────────────────────────────────────────

test('completed item count shows on the review page', async ({ page }) => {
  await page.goto('/')

  await page.getByText('+ New Front').click()
  await page.getByPlaceholder('Front name').fill('Review Front')
  await page.getByText('Create').click()

  await page.getByRole('link', { name: 'Review Front' }).click()
  await page.getByText('+ Add item').click()
  await page.getByPlaceholder('New item…').fill('Finish this')
  await page.keyboard.press('Enter')

  // Mark done via checkbox + popover (no session needed)
  await page.getByLabel('Complete item').click()
  await page.getByRole('button', { name: 'Mark done' }).click()

  await page.getByRole('link', { name: 'Review', exact: true }).click()
  await expect(page).toHaveURL('/review')

  const doneCard = page.getByTestId('count-done-items')
  await expect(doneCard.getByText('1')).toBeVisible()
})
```

- [ ] **Step 3: Run e2e tests**

```bash
npx playwright test
```
Expected: all e2e tests pass.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/flows.spec.ts
git commit -m "test(e2e): rewrite session flows to use startItem and CompletionPopover"
```

---

## Task 8: Playwright MCP smoke test

Start the dev server, then use Playwright MCP browser tools to verify key interactions manually:

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Navigate to app and create a front with one item**

Using Playwright MCP:
1. Navigate to `http://localhost:5173`
2. Click `+ New Front`, fill name, create
3. Navigate to the front's detail view
4. Add an item

- [ ] **Step 3: Verify Start button marks item in_progress**

Click "Start" on the item. Confirm:
- "In progress" badge appears on the item row
- No session bar appears at the top
- The item is not in the Done section

- [ ] **Step 4: Verify checkbox opens CompletionPopover**

Click the checkbox (Complete item button). Confirm:
- A small popover appears with a "Remarks (optional)" input and "Mark done" button

- [ ] **Step 5: Verify completing with a remark**

Type a remark, click "Mark done". Confirm:
- The popover closes
- The item moves to the "Done" section
- The remark text is visible under the done item

- [ ] **Step 6: Verify Cancel dismisses without completing**

Add another item, click its checkbox, click Cancel. Confirm:
- Item stays in the open list unchanged

- [ ] **Step 7: Verify open item can be completed directly (no Start needed)**

Add a third item, do NOT click Start, click checkbox directly. Confirm:
- Popover appears and item can be marked done from `open` state

- [ ] **Step 8: Stop dev server**
