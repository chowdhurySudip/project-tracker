const PATHS: Record<string, string> = {
  bolt: 'M13 2 4 14h6l-1 8 9-12h-6z',
  inbox: 'M3 13h4l1 3h6l1-3h4M5 5h14l2 8v5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-5z',
  calendar: 'M4 6h16v15H4zM4 10h16M8 3v4M16 3v4',
  plus: 'M12 5v14M5 12h14',
  check: 'M5 12l5 5L20 6',
  lock: 'M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  flame: 'M12 3c1 4 5 5 5 9a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5-1-8z',
  link: 'M9 15l6-6M8 12l-2 2a3 3 0 0 0 4 4l2-2M16 12l2-2a3 3 0 0 0-4-4l-2 2',
  idea: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10c1 1 1 2 1 3h6c0-1 0-2 1-3a6 6 0 0 0-4-10z',
  task: 'M4 6h16M4 12h16M4 18h10',
  clock: 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM12 8v4l3 2',
  pause: 'M9 5v14M15 5v14',
  layers: 'M12 3 3 8l9 5 9-5zM3 14l9 5 9-5',
  x: 'M6 6l12 12M18 6L6 18',
  trend: 'M4 16l5-5 4 4 7-8M16 7h4v4',
  pencil: 'M4 20l4-1L19 8l-3-3L5 16l-1 4zM14 7l3 3',
  doc: 'M7 3h8l4 4v14H7zM15 3v4h4',
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19',
  play: 'M8 5l11 7-11 7z',
  stop: 'M7 7h10v10H7z',
  timer: 'M12 22a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 14V9M9 2h6',
  cmd: 'M9 6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3z',
}

interface IconProps {
  name: string
  size?: number
  stroke?: number
  fill?: string
  style?: React.CSSProperties
}

export function Icon({ name, size = 18, stroke = 1.7, fill = 'none', style }: IconProps) {
  const d = PATHS[name]
  if (!d) return null
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flex: 'none', ...style }}
    >
      {d.split('M').filter(Boolean).map((seg, i) => (
        <path key={i} d={'M' + seg} />
      ))}
    </svg>
  )
}
