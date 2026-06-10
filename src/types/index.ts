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
  priority?: 'high' | 'normal' | 'low'
  timeEstimate?: number
  logs: Log[]
  createdAt: string
  startedAt?: string
  doneAt?: string
}

export interface CadenceTime {
  from?: number    // hour 0–23: "after X" constraint
  until?: number   // hour 0–23: "before X" constraint
  label?: string   // e.g. "before 10am", "evenings"
}

export interface Cadence {
  days: number[]   // 0=Sun…6=Sat; [] means every day
  time?: CadenceTime
}

export interface Front {
  id: string
  name: string
  type: FrontType
  color: string
  status: FrontStatus
  items: Item[]
  cadence: Cadence
  prerequisites: string[]
  blurb?: string
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
