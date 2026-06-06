# Command

A personal project tracker built with React 19, TypeScript, and Zustand.

## Features

- **Fronts** — projects, courses, or articles you're actively working through
- **Sessions** — timed focus sessions tied to a specific item, with pause/resume and log notes
- **Scheduling** — cadence-based daily view (Today) with hero, on-deck, and off-day sections
- **Capture** — quick-capture modal (press `C`) files ideas, tasks, and links to Inbox or directly to a front
- **Weekly review** — progress panels, Park buttons, and momentum tracking

## Stack

- React 19 + TypeScript
- Vite
- Zustand 5 (persistent store)
- React Router v6
- Vitest + Testing Library (151 unit/component tests)
- Playwright (E2E)

## Dev

```bash
npm install
npm run dev       # http://localhost:5173
npm run test      # unit + component tests
npm run test:e2e  # Playwright E2E
npm run build
```
