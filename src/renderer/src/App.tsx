import { useState } from 'react'

type Mode = 'note' | 'board'

export default function App(): React.JSX.Element {
  const [mode, setMode] = useState<Mode>('note')
  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-left" />
        <div className="mode-switch" role="group" aria-label="โหมด">
          <button className={mode === 'note' ? 'active' : ''} onClick={() => setMode('note')}>
            โน้ต
          </button>
          <button className={mode === 'board' ? 'active' : ''} onClick={() => setMode('board')}>
            กระดาน
          </button>
        </div>
        <div className="topbar-right" />
      </header>
      <main className="workspace" />
    </div>
  )
}
