import { useApp } from '../store/appStore'

export function Toast(): React.JSX.Element {
  const toast = useApp((s) => s.toast)
  return (
    <div className="toast-host" role="status" aria-live="polite">
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
