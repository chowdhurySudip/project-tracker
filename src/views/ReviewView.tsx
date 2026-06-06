import { useStore } from '@/store'
import type { Front } from '@/types'

function FrontParkRow({ front }: { front: Front }) {
  const openCount = front.items.filter((i) => i.status === 'open').length
  const doneCount = front.items.filter((i) => i.status === 'done').length
  return (
    <tr>
      <td>{front.name}</td>
      <td>{openCount} open</td>
      <td>{doneCount} done</td>
      <td>
        <button onClick={() =>
          useStore.getState().updateFront(front.id, { status: 'parked', parkReason: 'Parked from weekly review' })
        }>
          Park
        </button>
      </td>
    </tr>
  )
}

export function ReviewView() {
  const fronts = useStore((state) => state.fronts)

  const activeFronts = fronts.filter((f) => f.status === 'active')
  const parkedFronts = fronts.filter((f) => f.status === 'parked')
  const doneFronts = fronts.filter((f) => f.status === 'done')

  const allItems = fronts.flatMap((f) => f.items)
  const openItemCount = allItems.filter((i) => i.status === 'open').length
  const doneItemCount = allItems.filter((i) => i.status === 'done').length

  const progressFronts = activeFronts.filter((f) => f.items.some((i) => i.status === 'done'))
  const staleFronts = activeFronts.filter((f) => !f.items.some((i) => i.status === 'done'))

  if (activeFronts.length === 0) {
    return (
      <main className="review-view">
        <h1>Weekly Review</h1>
        <p className="review-empty">No active fronts. Add some on the home screen.</p>
      </main>
    )
  }

  return (
    <main className="review-view">
      <h1>Weekly Review</h1>

      <section className="review-counts">
        <div className="review-count-card" data-testid="count-active">
          <span className="review-count-value">{activeFronts.length}</span>
          <span className="review-count-label">Active fronts</span>
        </div>
        <div className="review-count-card" data-testid="count-parked">
          <span className="review-count-value">{parkedFronts.length}</span>
          <span className="review-count-label">Parked</span>
        </div>
        <div className="review-count-card" data-testid="count-done-fronts">
          <span className="review-count-value">{doneFronts.length}</span>
          <span className="review-count-label">Done fronts</span>
        </div>
        <div className="review-count-card" data-testid="count-open-items">
          <span className="review-count-value">{openItemCount}</span>
          <span className="review-count-label">Open items</span>
        </div>
        <div className="review-count-card" data-testid="count-done-items">
          <span className="review-count-value">{doneItemCount}</span>
          <span className="review-count-label">Done items</span>
        </div>
      </section>

      {progressFronts.length > 0 && (
        <section className="review-section">
          <h2>Had progress</h2>
          <p className="review-muted">{progressFronts.map((f) => f.name).join(', ')}</p>
        </section>
      )}

      {staleFronts.length > 0 && (
        <section className="review-section">
          <h2>No progress yet — consider parking</h2>
          <table className="review-table">
            <tbody>
              {staleFronts.map((f) => <FrontParkRow key={f.id} front={f} />)}
            </tbody>
          </table>
        </section>
      )}
    </main>
  )
}
