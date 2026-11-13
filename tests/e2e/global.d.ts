import type { Storage } from '../../src/shared/types'

declare global {
  interface Window {
    memo: Storage
  }
}
