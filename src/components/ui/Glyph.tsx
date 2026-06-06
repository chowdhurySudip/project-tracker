import { hsl, tint, getFrontHue } from '@/lib/ui'
import type { Front } from '@/types'

interface GlyphProps {
  front: Pick<Front, 'name' | 'color'>
  size?: number
  dim?: boolean
}

export function Glyph({ front, size = 38, dim = false }: GlyphProps) {
  const hue = getFrontHue(front.color)
  const initials = front.name
    .split(' ')
    .filter((w) => /[A-Za-z0-9]/.test(w[0] ?? ''))
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        flex: 'none',
        display: 'grid',
        placeItems: 'center',
        fontFamily: 'var(--mono)',
        fontWeight: 600,
        fontSize: size * 0.34,
        letterSpacing: '-0.02em',
        color: dim ? 'var(--ink-3)' : hsl(hue, 42),
        background: dim ? 'var(--sunk)' : tint(hue, 94, 4),
        border: `1px solid ${dim ? 'var(--line)' : tint(hue, 88, 5)}`,
      }}
    >
      {initials}
    </div>
  )
}
