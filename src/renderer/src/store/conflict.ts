import { ulid } from 'ulid'
import { CONFLICT_SUFFIX, type Note } from '@shared/types'

/**
 * The open note changed (or vanished) on disk. Never lose local edits:
 * if there are unsaved edits, keep them as a separate conflict-copy note.
 */
export function resolveExternalNoteChange(
  local: Note,
  dirty: boolean,
  disk: Note | null
): { load: Note | null; conflictCopy: Note | null } {
  const conflictCopy = dirty
    ? { ...local, id: ulid(), title: local.title + CONFLICT_SUFFIX, conflict: true, created: Date.now() }
    : null
  return { load: disk, conflictCopy }
}
