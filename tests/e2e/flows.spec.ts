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
  await page.getByText('+ New Front').click()
  await expect(page.getByRole('dialog')).toBeVisible()

  // Fill and submit
  await page.getByPlaceholder('Front name').fill('My Test Project')
  await page.getByText('Create').click()

  // Front appears in sidebar nav list as a link
  await expect(page.getByRole('link', { name: 'My Test Project' })).toBeVisible()

  // HomeView shows the "Focus now" section (front is scheduled every day by default)
  await expect(page.getByText('Focus now')).toBeVisible()
})

// ── Flow 2: Capture → file to front ────────────────────────────────────────

test('capture an idea, file it to a front, inbox clears', async ({ page }) => {
  await page.goto('/')

  // Create a front first
  await page.getByText('+ New Front').click()
  await page.getByPlaceholder('Front name').fill('Target Front')
  await page.getByText('Create').click()

  // Open CaptureModal with keyboard shortcut
  await page.keyboard.press('c')
  await expect(page.getByRole('dialog', { name: 'Capture' })).toBeVisible()

  // Type and save
  await page.getByPlaceholder('Capture anything…').fill('My great idea')
  await page.getByText('Save').click()

  // Capture appears in inbox
  await expect(page.getByText('My great idea')).toBeVisible()

  // File it to the front
  await page.getByText('File').click()
  await page.getByRole('combobox', { name: 'File to front' }).selectOption({ label: 'Target Front' })

  // Inbox is now clear
  await expect(page.getByText('Inbox is clear.')).toBeVisible()
  await expect(page.getByText('My great idea')).not.toBeVisible()
})

// ── Flow 3: Session — complete then abandon ─────────────────────────────────

test('session: Complete marks item done; Stop leaves it open', async ({ page }) => {
  await page.goto('/')

  // Create a front
  await page.getByText('+ New Front').click()
  await page.getByPlaceholder('Front name').fill('Work Front')
  await page.getByText('Create').click()

  // Navigate to detail view via sidebar link
  await page.getByRole('link', { name: 'Work Front' }).click()

  // Add two items
  await page.getByText('+ Add item').click()
  await page.getByPlaceholder('New item…').fill('Important task')
  await page.keyboard.press('Enter')

  await page.getByText('+ Add item').click()
  await page.getByPlaceholder('New item…').fill('Another task')
  await page.keyboard.press('Enter')

  // Start session on the first item
  const startButtons = page.getByText('Start')
  await startButtons.first().click()

  // SessionBar should appear
  await expect(page.getByRole('status')).toBeVisible()
  await expect(page.getByRole('status').getByText('Work Front')).toBeVisible()

  // Complete → item marked done, SessionBar disappears
  await page.getByText('Complete').click()
  await expect(page.getByRole('status')).not.toBeVisible()
  await expect(page.getByText('Done (1)')).toBeVisible()

  // Start session on the second item
  await page.getByText('Start').click()
  await expect(page.getByRole('status')).toBeVisible()

  // Stop (abandon) → item stays open
  await page.getByText('Stop').click()
  await expect(page.getByRole('status')).not.toBeVisible()
  await expect(page.getByText('Another task')).toBeVisible()
  // Done count should still be 1
  await expect(page.getByText('Done (1)')).toBeVisible()
})

// ── Flow 4: Weekly review ───────────────────────────────────────────────────

test('completed item count shows on the review page', async ({ page }) => {
  await page.goto('/')

  // Create front + item
  await page.getByText('+ New Front').click()
  await page.getByPlaceholder('Front name').fill('Review Front')
  await page.getByText('Create').click()

  // Navigate to detail view via sidebar link
  await page.getByRole('link', { name: 'Review Front' }).click()
  await page.getByText('+ Add item').click()
  await page.getByPlaceholder('New item…').fill('Finish this')
  await page.keyboard.press('Enter')

  // Start and complete the session
  await page.getByText('Start').click()
  await expect(page.getByRole('status')).toBeVisible()
  await page.getByText('Complete').click()

  // Navigate to review
  await page.getByRole('link', { name: 'Review', exact: true }).click()
  await expect(page).toHaveURL('/review')

  // Done items count card shows 1
  const doneCard = page.getByTestId('count-done-items')
  await expect(doneCard.getByText('1')).toBeVisible()
})

// ── Flow 5: Routing guard ───────────────────────────────────────────────────

test('unknown front ID redirects to home', async ({ page }) => {
  await page.goto('/front/nonexistent-front-id-99999')

  // Should redirect to / and render HomeView
  await expect(page).toHaveURL('/')
  // HomeView always shows "Focus now" section header
  await expect(page.getByRole('heading', { name: 'Focus now' })).toBeVisible()
})
