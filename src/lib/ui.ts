export const hsl = (hue: number, l = 56, c = 13): string =>
  `oklch(${(l / 100).toFixed(2)} ${(c / 100).toFixed(2)} ${hue})`

export const tint = (hue: number, l = 95, c = 3): string =>
  `oklch(${(l / 100).toFixed(2)} ${(c / 100).toFixed(2)} ${hue})`

export const getFrontHue = (color: string): number =>
  parseInt(color, 10) || 256

export const getProgress = (front: { items: Array<{ status: string }> }): number => {
  const total = front.items.length
  if (!total) return 0
  return front.items.filter((i) => i.status === 'done').length / total
}

export const getKindLabel = (type: string): string =>
  ({ project: 'Project', learning: 'Learning', article: 'Article' } as Record<string, string>)[type] ?? type

const WEEKDAYS_FULL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export const cadenceLabel = (days: number[]): string => {
  if (!days.length || days.length === 7) return 'Daily'
  if ([1, 2, 3, 4, 5].every((d) => days.includes(d)) && days.length === 5) return 'Weekdays'
  if ([0, 6].every((d) => days.includes(d)) && days.length === 2) return 'Weekends'
  return [...days].sort((a, b) => a - b).map((d) => WEEKDAYS_FULL[d]).join(', ')
}
