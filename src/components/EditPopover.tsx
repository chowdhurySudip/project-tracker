import { useRef, useEffect } from 'react'

interface EditPopoverProps {
  value: string
  onCommit: (value: string) => void
  onCancel: () => void
  multiline?: boolean
}

export function EditPopover({ value, onCommit, onCancel, multiline = false }: EditPopoverProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const cancelledRef = useRef(false)

  useEffect(() => {
    const el = multiline ? textareaRef.current : inputRef.current
    el?.focus()
    el?.select()
  }, [multiline])

  function getValue() {
    return inputRef.current?.value ?? textareaRef.current?.value ?? ''
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault()
      onCommit(getValue())
    }
    if (e.key === 'Escape') {
      cancelledRef.current = true
      onCancel()
    }
  }

  function handleBlur() {
    if (cancelledRef.current) return
    onCommit(getValue())
  }

  const shared = { defaultValue: value, onKeyDown: handleKeyDown, onBlur: handleBlur, className: 'edit-popover-input' }

  return multiline
    ? <textarea ref={textareaRef} {...shared} />
    : <input ref={inputRef} {...shared} />
}
