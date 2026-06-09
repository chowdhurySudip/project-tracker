import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.removeItem('command-v1'))
  await page.reload()
})

// ── Flow 1: Create a front ─────────────────────────────────────────────────

test('create a front — appears in sidebar and HomeView', async ({ page }) => {
  await page.goto('/')

  // Open FrontModal via sidebar button
  await page.getByRole('button', { name: 'New front' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()

  // Fill and submit
  await page.getByPlaceholder('e.g. Rust for systems').fill('My Test Project')
  await page.getByRole('button', { name: 'Create front' }).click()

  // Front appears in sidebar nav list as a link
  await expect(page.getByRole('link', { name: 'My Test Project' })).toBeVisible()

  // HomeView shows the "Focus now" section (front is scheduled every day by default)
  await expect(page.getByText('Focus now')).toBeVisible()
})

// ── Flow 2: Capture → file to front ────────────────────────────────────────

test('capture an idea, file it to a front, inbox clears', async ({ page }) => {
  await page.goto('/')

  // Create a front first
  await page.getByRole('button', { name: 'New front' }).click()
  await page.getByPlaceholder('e.g. Rust for systems').fill('Target Front')
  await page.getByRole('button', { name: 'Create front' }).click()

  // Open CaptureModal with keyboard shortcut
  await page.keyboard.press('c')
  await expect(page.getByRole('dialog', { name: 'Capture' })).toBeVisible()

  // Type and save
  await page.getByPlaceholder('Capture anything…').fill('My great idea')
  await page.getByRole('button', { name: 'Save' }).click()

  // Capture appears in inbox
  await expect(page.getByText('My great idea')).toBeVisible()

  // File it to the front
  await page.getByText('File').click()
  await page.getByRole('combobox', { name: 'File to front' }).selectOption({ label: 'Target Front' })

  // Inbox is now clear
  await expect(page.getByText('Inbox is clear.')).toBeVisible()
  await expect(page.getByText('My great idea')).not.toBeVisible()
})

// ── Flow 3: Start item, complete with remark ────────────────────────────────

test('start item marks in_progress; complete with remark appears in done list', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('button', { name: 'New front' }).click()
  await page.getByPlaceholder('e.g. Rust for systems').fill('Work Front')
  await page.getByRole('button', { name: 'Create front' }).click()

  await page.getByRole('link', { name: 'Work Front' }).click()

  await page.getByText('+ Add item').click()
  await page.getByPlaceholder('New item…').fill('Important task')
  await page.keyboard.press('Enter')

  // Start marks item as in_progress — no session bar
  await page.getByRole('button', { name: 'Start' }).click()
  await expect(page.getByText('In progress')).toBeVisible()
  await expect(page.getByRole('status')).not.toBeVisible()

  // Done button opens CompletionModal
  await page.getByRole('button', { name: 'Done' }).click()
  await expect(page.getByRole('dialog', { name: 'Complete item' })).toBeVisible()

  // Type remark and confirm
  await page.getByPlaceholder('Add a closing remark (optional)').fill('Wrapped up nicely')
  await page.getByRole('button', { name: 'Mark done' }).click()

  // Item is now done with log text visible
  await expect(page.getByText('Done · 1')).toBeVisible()
  await expect(page.getByText('Wrapped up nicely')).toBeVisible()
})

test('completing item without remark creates no log entry', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('button', { name: 'New front' }).click()
  await page.getByPlaceholder('e.g. Rust for systems').fill('Front B')
  await page.getByRole('button', { name: 'Create front' }).click()
  await page.getByRole('link', { name: 'Front B' }).click()

  await page.getByText('+ Add item').click()
  await page.getByPlaceholder('New item…').fill('Quick task')
  await page.keyboard.press('Enter')

  await page.getByRole('button', { name: 'Done' }).click()
  await page.getByRole('button', { name: 'Mark done' }).click()

  await expect(page.getByText('Done · 1')).toBeVisible()
  // No log chip should appear on the done item
  await expect(page.getByText('0 logs')).not.toBeVisible()
})

test('dismissing completion modal leaves item unchanged', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('button', { name: 'New front' }).click()
  await page.getByPlaceholder('e.g. Rust for systems').fill('Front C')
  await page.getByRole('button', { name: 'Create front' }).click()
  await page.getByRole('link', { name: 'Front C' }).click()

  await page.getByText('+ Add item').click()
  await page.getByPlaceholder('New item…').fill('Undecided task')
  await page.keyboard.press('Enter')

  await page.getByRole('button', { name: 'Done' }).click()
  await expect(page.getByRole('dialog', { name: 'Complete item' })).toBeVisible()
  await page.getByRole('button', { name: 'Cancel' }).click()

  // Item still visible as active — no done section
  await expect(page.getByText('Undecided task')).toBeVisible()
  await expect(page.getByText('Done · 1')).not.toBeVisible()
})

// ── Flow 4: Weekly review ───────────────────────────────────────────────────

test('completed item count shows on the review page', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('button', { name: 'New front' }).click()
  await page.getByPlaceholder('e.g. Rust for systems').fill('Review Front')
  await page.getByRole('button', { name: 'Create front' }).click()

  await page.getByRole('link', { name: 'Review Front' }).click()
  await page.getByText('+ Add item').click()
  await page.getByPlaceholder('New item…').fill('Finish this')
  await page.keyboard.press('Enter')

  // Mark done via Done button + modal (no session needed)
  await page.getByRole('button', { name: 'Done' }).click()
  await page.getByRole('button', { name: 'Mark done' }).click()

  await page.getByRole('link', { name: 'Weekly review' }).click()
  await expect(page).toHaveURL('/review')

  const doneCard = page.getByTestId('count-done-items')
  await expect(doneCard.getByText('1')).toBeVisible()
})

// ── Flow 5: Routing guard ───────────────────────────────────────────────────

test('unknown front ID redirects to home', async ({ page }) => {
  await page.goto('/front/nonexistent-front-id-99999')

  // Should redirect to / and render HomeView
  await expect(page).toHaveURL('/')
  // HomeView always shows the stats section
  await expect(page.getByText('Active fronts')).toBeVisible()
})
