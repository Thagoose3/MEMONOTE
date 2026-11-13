import { useEffect } from 'react'
import { storage } from './storage'
import { actions, useApp } from './store/appStore'
import { TopBar } from './shell/TopBar'
import { Drawer } from './shell/Drawer'
import { QuickSearch } from './shell/QuickSearch'
import { Home } from './shell/Home'
import { Toast } from './shell/Toast'
import { NotePage } from './shell/NotePage'
import { BoardPage, newBoardShortcut } from './shell/boardPage'

export default function App(): React.JSX.Element {
  const ready = useApp((s) => s.ready)
  const vault = useApp((s) => s.vault)
  const mode = useApp((s) => s.mode)
  const hasNote = useApp((s) => !!s.openNote)

  useEffect(() => {
    void actions.init()
    const offFlush = storage.onFlushRequest(() => actions.flush())
    const offExt = storage.onExternalChange((e) => void actions.handleExternal(e))
    return () => {
      offFlush()
      offExt()
    }
  }, [])

  useEffect(() => {
    document.body.dataset.ready = ready ? '1' : '0'
  }, [ready])

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (!e.ctrlKey || e.altKey) return
      const k = e.key.toLowerCase()
      if (k === 'n' && !e.shiftKey) {
        e.preventDefault()
        if (!useApp.getState().vault) return
        if (useApp.getState().mode === 'board') newBoardShortcut()
        else void actions.newNote()
      } else if (k === 'p' && !e.shiftKey) {
        e.preventDefault()
        if (useApp.getState().vault) actions.openSearch()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="app">
      <TopBar />
      <main className="workspace">
        {!ready ? null : !vault ? <Home /> : mode === 'board' ? <BoardPage /> : hasNote ? <NotePage /> : <Home />}
      </main>
      <Drawer />
      <QuickSearch />
      <Toast />
    </div>
  )
}
