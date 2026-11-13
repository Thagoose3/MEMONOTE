export type DocMark = { type: string; attrs?: Record<string, unknown> }
export type DocNode = {
  type: string
  attrs?: Record<string, unknown>
  content?: DocNode[]
  text?: string
  marks?: DocMark[]
}

export interface Note {
  id: string
  title: string
  folder: string | null
  created: number
  updated: number
  content: DocNode
  conflict?: boolean
}

export interface NoteMeta {
  id: string
  title: string
  folder: string | null
  created: number
  updated: number
  text: string
  linkIds: string[]
  firstImage: string | null
  conflict?: boolean
}

export type StrokePoint = [x: number, y: number, pressure: number]
export type PenSize = 'S' | 'M' | 'L'

export type BoardNode = { id: string; x: number; y: number; w?: number; h?: number } & (
  | { kind: 'note'; noteId: string }
  | { kind: 'text'; text: string }
  | { kind: 'image'; file: string }
  | { kind: 'stroke'; points: StrokePoint[]; color: string; size: PenSize }
)
export type StrokeNode = Extract<BoardNode, { kind: 'stroke' }>

export type EdgeColor = 'gray' | 'blue' | 'green' | 'red'
export type Side = 'top' | 'right' | 'bottom' | 'left'
export interface BoardEdge {
  id: string
  from: string
  to: string
  label?: string
  color: EdgeColor
  fromSide?: Side
  toSide?: Side
}

export interface Board {
  id: string
  title: string
  created: number
  updated: number
  nodes: BoardNode[]
  edges: BoardEdge[]
}

export interface BoardMeta {
  id: string
  title: string
  updated: number
}

export interface Folder {
  id: string
  name: string
}

export interface VaultFile {
  version: 1
  folders: Folder[]
}

export interface AssetRef {
  file: string
  width: number
  height: number
}

export interface ListResult<T> {
  items: T[]
  broken: string[]
}

export type ExternalChange = { kind: 'note' | 'board'; id: string; change: 'changed' | 'removed' }

export interface Storage {
  vault: {
    current(): Promise<string | null>
    choose(): Promise<string | null>
    readFile(): Promise<VaultFile>
    writeFile(v: VaultFile): Promise<void>
  }
  notes: {
    listMeta(): Promise<ListResult<NoteMeta>>
    read(id: string): Promise<Note>
    save(n: Note): Promise<NoteMeta>
    trash(id: string): Promise<void>
    restore(id: string): Promise<void>
    listTrash(): Promise<NoteMeta[]>
  }
  boards: {
    list(): Promise<ListResult<BoardMeta>>
    read(id: string): Promise<Board>
    save(b: Board): Promise<void>
    trash(id: string): Promise<void>
  }
  assets: {
    saveImage(bytes: Uint8Array, mime: string): Promise<AssetRef>
    downloadImage(url: string): Promise<AssetRef>
  }
  onExternalChange(cb: (e: ExternalChange) => void): () => void
  onFlushRequest(cb: () => Promise<void>): () => void
}

export const CONFLICT_SUFFIX = ' (สำเนาขัดแย้ง)'
