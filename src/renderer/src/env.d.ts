/// <reference types="vite/client" />
import type { Storage } from '@shared/types'

declare global {
  interface Window {
    memo: Storage
  }
}
