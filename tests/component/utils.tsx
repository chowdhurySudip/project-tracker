import { type ReactNode } from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
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

export function resetStore() {
  useStore.setState({ fronts: [], captures: [], session: null }, true)
}
