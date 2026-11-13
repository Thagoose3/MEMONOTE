import { create } from 'zustand'
import { ulid } from 'ulid'
import type { BoardMeta, DocNode, ExternalChange, Folder, Note, NoteMeta } from '@shared/types'
import { noteToMeta } from '@shared/doc'
import { storage } from '../storage'
import { createSearchIndex } from '../search/searchIndex'
import { computeBacklinks } from '../links/backlinks'
import { createAutosaver } from './autosave'
import { resolveExternalNoteChange } from './conflict'
import { fillUpload, stripOrphanPlaceholders } from '../editor/uploadDoc'
import { pendingUploadIds, waitForUploads } from '../editor/uploads'

export type Mode = 'note' | 'board'

export const searchIndex = createSearchIndex()

export const EMPTY_DOC: DocNode = { type: 'doc', content: [{ type: 'paragraph' }] }

export interface AppState {
  ready: boolean
  vault: string | null
  mode: Mode
  metas: Record<string, NoteMeta>
  backlinks: Map<string, string[]>
  folders: Folder[]
  boards: BoardMeta[]
  openNote: Note | null
  /** bumps when the open note is replaced from outside the editor (load/external change) */
  noteVersion: number
  openBoardId: string | null
  drawerOpen: boolean
  search: { open: boolean; onPick: ((id: string) => void) | null }
  toast: string | null
  focusTitle: number
}

const initial: AppState = {
  ready: false,
  vault: null,
  mode: 'note',
  metas: {},
  backlinks: new Map(),
  folders: [],
  boards: [],
  openNote: null,
  noteVersion: 0,
  openBoardId: null,
  drawerOpen: false,
  search: { open: false, onPick: null },
  toast: null,
  focusTitle: 0
}

export const useApp = create<AppState>(() => initial)
const set = useApp.setState
const get = useApp.getState

function putMetas(update: (m: Record<string, NoteMeta>) => void): void {
  const metas = { ...get().metas }
  update(metas)
  set({ metas, backlinks: computeBacklinks(Object.values(metas)) })
}

function applyMeta(meta: NoteMeta): void {
  searchIndex.upsert(meta)
  putMetas((m) => {
    m[meta.id] = meta
  })
}

function dropMeta(id: string): void {
  searchIndex.remove(id)
  putMetas((m) => {
    delete m[id]
  })
}

let dirty = false
const noteSaver = createAutosaver<Note>(async (n) => {
  const meta = await storage.notes.save(n)
  dirty = false
  applyMeta(meta)
})

export function showToast(text: string): void {
  set({ toast: text })
  setTimeout(() => {
    if (get().toast === text) set({ toast: null })
  }, 4000)
}

export const actions = {
  async init(): Promise<void> {
    const vault = await storage.vault.current()
    set({ vault })
    if (vault) await actions.loadVault()
    set({ ready: true })
  },

  async loadVault(): Promise<void> {
    const [{ items, broken }, vf, boards] = await Promise.all([
      storage.notes.listMeta(),
      storage.vault.readFile(),
      storage.boards.list()
    ])
    searchIndex.setAll(items)
    const metas: Record<string, NoteMeta> = {}
    for (const m of items) metas[m.id] = m
    set({
      metas,
      backlinks: computeBacklinks(items),
      folders: vf.folders,
      boards: boards.items,
      openNote: null,
      openBoardId: null
    })
    const nBroken = broken.length + boards.broken.length
    if (nBroken) showToast(`อ่านไฟล์ไม่ได้ ${nBroken} ไฟล์`)
  },

  async chooseVault(): Promise<void> {
    await noteSaver.flush()
    const vault = await storage.vault.choose()
    if (vault && vault !== get().vault) {
      set({ vault })
      await actions.loadVault()
    }
  },

  /** Wait for in-flight image uploads (they may still edit the note), then write pending edits. */
  async flush(): Promise<void> {
    await waitForUploads()
    await noteSaver.flush()
  },

  /** An image upload finished after its editor went away: write the result into the note itself. */
  async resolveUpload(noteId: string, uploadId: string, file: string | null): Promise<void> {
    await noteSaver.flush()
    const open = get().openNote
    if (open?.id === noteId) {
      const next = { ...open, content: fillUpload(open.content, uploadId, file) }
      set((s) => ({ openNote: next, noteVersion: s.noteVersion + 1 }))
      noteSaver.schedule(next)
      await noteSaver.flush()
      return
    }
    const note = await storage.notes.read(noteId).catch(() => null)
    if (!note) return
    const content = fillUpload(note.content, uploadId, file)
    if (content !== note.content) applyMeta(await storage.notes.save({ ...note, content }))
  },

  setMode(mode: Mode): void {
    set({ mode, drawerOpen: false })
  },

  async openNote(id: string): Promise<void> {
    await noteSaver.flush()
    const raw = await storage.notes.read(id)
    const note = { ...raw, content: stripOrphanPlaceholders(raw.content, pendingUploadIds()) }
    set((s) => ({ openNote: note, noteVersion: s.noteVersion + 1, mode: 'note', drawerOpen: false }))
  },

  closeNote(): void {
    void noteSaver.flush()
    set({ openNote: null })
  },

  async newNote(opts: { folder?: string | null; title?: string; open?: boolean } = {}): Promise<Note> {
    await noteSaver.flush()
    const now = Date.now()
    const folder = opts.folder !== undefined ? opts.folder : (get().openNote?.folder ?? null)
    const note: Note = { id: ulid(), title: opts.title ?? '', folder, created: now, updated: now, content: EMPTY_DOC }
    const meta = await storage.notes.save(note)
    applyMeta(meta)
    if (opts.open !== false) {
      set((s) => ({
        openNote: note,
        noteVersion: s.noteVersion + 1,
        mode: 'note',
        drawerOpen: false,
        focusTitle: s.focusTitle + 1
      }))
    }
    return note
  },

  /** Editor/title changes to the open note: update state now, save debounced. */
  editOpenNote(patch: { title?: string; content?: DocNode }): void {
    const cur = get().openNote
    if (!cur) return
    const next = { ...cur, ...patch }
    dirty = true
    set({ openNote: next })
    if (patch.title !== undefined) {
      const meta = get().metas[cur.id]
      // index the new title immediately so search/[[ ]] find it before autosave runs
      if (meta) applyMeta({ ...meta, title: patch.title })
    }
    noteSaver.schedule(next)
  },

  async updateNote(id: string, patch: Partial<Pick<Note, 'title' | 'folder'>>): Promise<void> {
    if (get().openNote?.id === id) {
      const next = { ...get().openNote!, ...patch }
      set({ openNote: next })
      noteSaver.schedule(next)
      await noteSaver.flush()
      return
    }
    const note = await storage.notes.read(id)
    applyMeta(await storage.notes.save({ ...note, ...patch }))
  },

  async trashNote(id: string): Promise<void> {
    if (get().openNote?.id === id) {
      await noteSaver.flush()
      set({ openNote: null })
    }
    await storage.notes.trash(id)
    dropMeta(id)
  },

  async restoreNote(id: string): Promise<void> {
    await storage.notes.restore(id)
    const note = await storage.notes.read(id)
    applyMeta(await storage.notes.save(note))
  },

  async saveFolders(folders: Folder[]): Promise<void> {
    set({ folders })
    await storage.vault.writeFile({ version: 1, folders })
  },

  async addFolder(name: string): Promise<void> {
    await actions.saveFolders([...get().folders, { id: ulid(), name }])
  },

  async renameFolder(id: string, name: string): Promise<void> {
    await actions.saveFolders(get().folders.map((f) => (f.id === id ? { ...f, name } : f)))
  },

  async deleteFolder(id: string): Promise<void> {
    const inside = Object.values(get().metas).filter((m) => m.folder === id)
    for (const m of inside) await actions.updateNote(m.id, { folder: null })
    await actions.saveFolders(get().folders.filter((f) => f.id !== id))
  },

  setDrawer(open: boolean): void {
    set({ drawerOpen: open })
  },

  openSearch(onPick: ((id: string) => void) | null = null): void {
    set({ search: { open: true, onPick }, drawerOpen: false })
  },

  closeSearch(): void {
    set({ search: { open: false, onPick: null } })
  },

  async refreshBoards(): Promise<void> {
    set({ boards: (await storage.boards.list()).items })
  },

  setOpenBoard(id: string | null): void {
    set({ openBoardId: id, mode: 'board', drawerOpen: false })
  },

  async handleExternal(e: ExternalChange): Promise<void> {
    if (e.kind === 'board') {
      await actions.refreshBoards()
      boardExternalListeners.forEach((l) => l(e))
      return
    }
    const disk = e.change === 'removed' ? null : await storage.notes.read(e.id).catch(() => null)
    if (disk) applyMeta(noteToMeta(disk))
    else dropMeta(e.id)
    const open = get().openNote
    if (!open || open.id !== e.id) return
    const isDirty = dirty || noteSaver.pending()
    // disk wins for this id; never write the stale local version over it
    noteSaver.cancel()
    dirty = false
    const { load, conflictCopy } = resolveExternalNoteChange(open, isDirty, disk)
    if (conflictCopy) {
      applyMeta(await storage.notes.save(conflictCopy))
      showToast('ไฟล์ถูกแก้จากที่อื่น เก็บฉบับของคุณไว้เป็น "สำเนาขัดแย้ง"')
    }
    set((s) => ({ openNote: load, noteVersion: s.noteVersion + 1 }))
  }
}

type BoardListener = (e: ExternalChange) => void
const boardExternalListeners = new Set<BoardListener>()
export function onBoardExternal(l: BoardListener): () => void {
  boardExternalListeners.add(l)
  return () => boardExternalListeners.delete(l)
}

export function folderName(id: string | null): string | null {
  if (!id) return null
  return get().folders.find((f) => f.id === id)?.name ?? null
}
