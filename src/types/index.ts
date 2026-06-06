export type FrontType = 'project' | 'learning' | 'article'
export type FrontStatus = 'active' | 'parked' | 'done'
export type ItemStatus = 'open' | 'in_progress' | 'done'
export type FocusLevel = 'light' | 'medium' | 'deep'
export type CaptureType = 'idea' | 'link' | 'task'

export interface Log {
  id: string
  text: string
  createdAt: string
}

export interface Item {
  id: string
  text: string
  status: ItemStatus
  order: number
  focusLevel?: FocusLevel
  timeEstimate?: number
  logs: Log[]
  createdAt: string
  startedAt?: string
  doneAt?: string
}

export interface Cadence {
  days: number[]        // 0=Sun…6=Sat; [] means every day
  timeWindow?: { start: string; end: string }  // "09:00" format
}

export interface Front {
  id: string
  name: string
  type: FrontType
  color: string         // oklch hue value as string, e.g. "256"
  status: FrontStatus
  items: Item[]
  cadence: Cadence
  prerequisites: string[]   // front IDs
  parkReason?: string
  createdAt: string
}

export interface Capture {
  id: string
  text: string
  type?: CaptureType
  frontId?: string      // set when filed to a front
  createdAt: string
}

export interface Session {
  frontId: string
  itemId: string
  startedAt: string
  elapsed: number       // seconds
  paused: boolean
}
