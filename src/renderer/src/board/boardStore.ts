import { create } from 'zustand'
import { ulid } from 'ulid'
import { CONFLICT_SUFFIX, type Board, type BoardEdge, type BoardNode, type PenSize } from '@shared/types'
import { createHistory } from './history'
import { PEN_COLORS } from './strokePath'
import { storage } from '../storage'
import { actions as app, onBoardExternal, showToast, useApp } from '../store/appStore'
import { createAutosaver } from '../store/autosave'
import { publishBoardTitle } from '../shell/boardTitle'
import { addLinkedNotes } from './boardModel'

export type Tool = 'select' | 'hand' | 'pen' | 'eraser' | 'text' | 'connect'

export interface BoardState {
  board: Board | null
  /** bumps whenever `board` is replaced from outside the canvas, so the canvas reloads it */
  rev: number
  tool: Tool
  editingEdge: string | null
  editingText: string | null
  penColor: string
  penSize: PenSize
  /** strokes the eraser is currently sweeping over (shown faded until release) */
  erasing: Set<string>
}

export const useBoard = create<BoardState>(() => ({
  board: null,
  rev: 0,
  tool: 'select',
  editingEdge: null,
  editingText: null,
  penColor: PEN_COLORS[0],
  penSize: 'M',
  erasing: new Set()
}))
const set = useBoard.setState
const get = useBoard.getState

const saver = createAutosaver<Board>((b) => storage.boards.save(b))
storage.onFlushRequest(() => boardActions.flush())

/** A text field on the canvas that is being edited right now and how to commit its current value. */
let pendingEdit: (() => void) | null = null
export function registerPendingEdit(fn: (() => void) | null): void {
  pendingEdit = fn
}
function commitPendingEdit(): void {
  const fn = pendingEdit
  pendingEdit = null
  fn?.()
}

function publish(b: Board | null): void {
  publishBoardTitle(b ? { title: b.title, rename: (t) => boardActions.rename(t) } : null)
}

const history = createHistory<Board>(100)

export const DEFAULT_BOARD_TITLE = 'กระดานใหม่'

export const boardActions = {
  async open(id: string): Promise<void> {
    await boardActions.flush()
    const board = await storage.boards.read(id)
    set((s) => ({ board, rev: s.rev + 1, editingEdge: null, editingText: null }))
    publish(board)
    app.setOpenBoard(id)
    history.reset(board)
  },

  async create(): Promise<void> {
    await boardActions.flush()
    const now = Date.now()
    const board: Board = { id: ulid(), title: DEFAULT_BOARD_TITLE, created: now, updated: now, nodes: [], edges: [] }
    await storage.boards.save(board)
    await app.refreshBoards()
    await boardActions.open(board.id)
  },

  close(): void {
    void boardActions.flush()
    set({ board: null })
    publish(null)
    useApp.setState({ openBoardId: null })
  },

  async rename(title: string): Promise<void> {
    const b = get().board
    if (!b) return
    boardActions.commit({ ...b, title })
    publish(get().board)
    await saver.flush()
    await app.refreshBoards()
  },

  async renameById(id: string, title: string): Promise<void> {
    if (get().board?.id === id) return boardActions.rename(title)
    const b = await storage.boards.read(id)
    await storage.boards.save({ ...b, title })
    await app.refreshBoards()
  },

  async trash(id: string): Promise<void> {
    if (get().board?.id === id) {
      saver.cancel()
      boardActions.close()
    }
    await storage.boards.trash(id)
    await app.refreshBoards()
  },

  /** A change made on the canvas (canvas already shows it). */
  commit(board: Board): void {
    set({ board })
    saver.schedule(board)
    history.push(board)
  },

  /** A change made outside the canvas: commit and make the canvas reload. */
  replace(board: Board, record = true): void {
    set((s) => ({ board, rev: s.rev + 1 }))
    saver.schedule(board)
    if (record) history.push(board)
  },

  /** Change one node's fields from outside the canvas (e.g. committing an open text field). */
  patchNode(id: string, patch: Partial<Extract<BoardNode, { kind: 'text' }>>): void {
    const b = get().board
    if (!b) return
    boardActions.replace({ ...b, nodes: b.nodes.map((n) => (n.id === id ? ({ ...n, ...patch } as BoardNode) : n)) })
  },

  patchEdge(id: string, patch: Partial<BoardEdge>): void {
    const b = get().board
    if (!b) return
    boardActions.replace({ ...b, edges: b.edges.map((e) => (e.id === id ? { ...e, ...patch } : e)) })
  },

  addElements(nodes: BoardNode[], edges: BoardEdge[] = []): void {
    const b = get().board
    if (!b) return
    boardActions.replace({ ...b, nodes: [...b.nodes, ...nodes], edges: [...b.edges, ...edges] })
  },

  addLinked(cardId: string): void {
    const b = get().board
    if (!b) return
    const metas = new Map(Object.entries(useApp.getState().metas))
    const next = addLinkedNotes(b, cardId, metas)
    if (next === b) showToast('ไม่มีโน้ตที่ลิงก์ไว้เพิ่มเติม')
    else boardActions.replace(next)
  },

  setTool(tool: Tool): void {
    set({ tool })
  },

  setPen(p: Partial<Pick<BoardState, 'penColor' | 'penSize'>>): void {
    set(p)
  },

  undo(): void {
    const prev = history.undo()
    if (prev) boardActions.replace({ ...prev, title: get().board?.title ?? prev.title }, false)
  },

  redo(): void {
    const next = history.redo()
    if (next) boardActions.replace({ ...next, title: get().board?.title ?? next.title }, false)
  },

  setEditingEdge(id: string | null): void {
    set({ editingEdge: id })
  },

  setEditingText(id: string | null): void {
    set({ editingText: id })
  },

  /** Commit any text field being edited on the canvas, then write pending changes. */
  flush(): Promise<void> {
    commitPendingEdit()
    return saver.flush()
  }
}

onBoardExternal(async (e) => {
  const cur = get().board
  if (!cur || cur.id !== e.id) return
  const pending = saver.pending()
  saver.cancel()
  if (pending) {
    const copy: Board = { ...cur, id: ulid(), title: cur.title + CONFLICT_SUFFIX }
    await storage.boards.save(copy)
    showToast('กระดานถูกแก้จากที่อื่น เก็บฉบับของคุณไว้เป็น "สำเนาขัดแย้ง"')
  }
  if (e.change === 'removed') {
    boardActions.close()
  } else {
    const disk = await storage.boards.read(e.id).catch(() => null)
    if (disk) {
      set((s) => ({ board: disk, rev: s.rev + 1 }))
      publish(disk)
      history.reset(disk)
    }
  }
  await app.refreshBoards()
})
