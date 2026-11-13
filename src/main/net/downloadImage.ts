import type { AssetRef } from '@shared/types'

/** Implemented in Task 11. */
export async function downloadImage(
  _url: string,
  _save: (bytes: Uint8Array, mime: string) => Promise<AssetRef>
): Promise<AssetRef> {
  throw new Error('not-implemented')
}
