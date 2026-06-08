import { type ReactNode, type ReactElement } from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { useStore } from '@/store'

export function renderWithRouter(
  ui: ReactNode,
  { initialEntries = ['/'], ...options }: RenderOptions & { initialEntries?: string[] } = {}
) {
  return render(ui, {
    wrapper: ({ children }) => (
      <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
    ),
    ...options,
  })
}

export function renderAtPath(
  element: ReactElement,
  routePath: string,
  initialPath: string
) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path={routePath} element={element} />
        <Route path="*" element={<div data-testid="redirected" />} />
      </Routes>
    </MemoryRouter>
  )
}

export function resetStore() {
  useStore.setState({ fronts: [], captures: [] })
}
