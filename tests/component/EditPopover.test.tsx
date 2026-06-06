import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EditPopover } from '@/components/EditPopover'

describe('EditPopover', () => {
  it('renders an input with the initial value', () => {
    render(<EditPopover value="hello" onCommit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByDisplayValue('hello')).toBeInTheDocument()
  })

  it('calls onCommit with new value on Enter', async () => {
    const onCommit = vi.fn()
    render(<EditPopover value="hello" onCommit={onCommit} onCancel={vi.fn()} />)
    const input = screen.getByDisplayValue('hello')
    await userEvent.clear(input)
    await userEvent.type(input, 'world{Enter}')
    expect(onCommit).toHaveBeenCalledWith('world')
  })

  it('calls onCommit on blur', async () => {
    const onCommit = vi.fn()
    render(
      <div>
        <EditPopover value="initial" onCommit={onCommit} onCancel={vi.fn()} />
        <button>outside</button>
      </div>
    )
    await userEvent.click(screen.getByText('outside'))
    expect(onCommit).toHaveBeenCalled()
  })

  it('calls onCancel on Escape and does NOT call onCommit', async () => {
    const onCommit = vi.fn()
    const onCancel = vi.fn()
    render(<EditPopover value="hello" onCommit={onCommit} onCancel={onCancel} />)
    await userEvent.keyboard('{Escape}')
    expect(onCancel).toHaveBeenCalledOnce()
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('renders a textarea in multiline mode', () => {
    render(<EditPopover value="text" onCommit={vi.fn()} onCancel={vi.fn()} multiline />)
    expect(screen.getByRole('textbox').tagName).toBe('TEXTAREA')
  })
})
