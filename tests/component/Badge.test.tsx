import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge } from '@/components/Badge'

describe('Badge', () => {
  it('renders "Project" for variant project', () => {
    render(<Badge variant="project" />)
    expect(screen.getByText('Project')).toBeInTheDocument()
  })

  it('renders "In progress" for variant in_progress', () => {
    render(<Badge variant="in_progress" />)
    expect(screen.getByText('In progress')).toBeInTheDocument()
  })

  it('renders "Parked" for variant parked', () => {
    render(<Badge variant="parked" />)
    expect(screen.getByText('Parked')).toBeInTheDocument()
  })

  it('renders "Deep" for variant deep', () => {
    render(<Badge variant="deep" />)
    expect(screen.getByText('Deep')).toBeInTheDocument()
  })

  it('applies a CSS class containing the variant name', () => {
    const { container } = render(<Badge variant="done" />)
    expect(container.firstChild).toHaveClass('badge-done')
  })
})
