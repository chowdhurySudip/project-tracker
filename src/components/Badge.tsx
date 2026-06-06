import type { FrontType, FrontStatus, ItemStatus, FocusLevel, CaptureType } from '@/types'

type BadgeVariant = FrontType | FrontStatus | ItemStatus | FocusLevel | CaptureType

const LABELS: Record<BadgeVariant, string> = {
  project: 'Project', learning: 'Learning', article: 'Article',
  active: 'Active', parked: 'Parked', done: 'Done',
  open: 'Open', in_progress: 'In progress',
  light: 'Light', medium: 'Medium', deep: 'Deep',
  idea: 'Idea', link: 'Link', task: 'Task',
}

interface BadgeProps { variant: BadgeVariant }

export function Badge({ variant }: BadgeProps) {
  return (
    <span className={`badge badge-${variant.replace('_', '-')}`}>
      {LABELS[variant]}
    </span>
  )
}
