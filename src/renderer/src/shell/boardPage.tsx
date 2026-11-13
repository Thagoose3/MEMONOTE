import { useEffect } from 'react'
import { useApp } from '../store/appStore'
import { boardActions, useBoard } from '../board/boardStore'
import { BoardView } from '../board/BoardView'

const fmt = new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short' })

export function BoardPage(): React.JSX.Element {
  const openId = useApp((s) => s.openBoardId)
  const board = useBoard((s) => s.board)
  const boards = useApp((s) => s.boards)

  // Re-open the last board after a vault reload or when state got out of sync.
  useEffect(() => {
    if (openId && board?.id !== openId) void boardActions.open(openId)
  }, [openId, board?.id])

  if (openId && board) return <BoardView />
  const sorted = [...boards].sort((a, b) => b.updated - a.updated)
  return (
    <div className="home board-home">
      <h1 className="home-logo">กระดาน</h1>
      <div className="home-menu">
        <button className="home-row" onClick={() => void boardActions.create()}>
          <span>สร้างกระดาน</span>
          <kbd>Ctrl N</kbd>
        </button>
        {sorted.length > 0 && <div className="home-sep">กระดานทั้งหมด</div>}
        {sorted.map((b) => (
          <button key={b.id} className="home-row" aria-label={b.title || 'ไม่มีชื่อ'} onClick={() => void boardActions.open(b.id)}>
            <span>{b.title || 'ไม่มีชื่อ'}</span>
            <span className="home-date">{fmt.format(b.updated)}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export function newBoardShortcut(): void {
  void boardActions.create()
}
