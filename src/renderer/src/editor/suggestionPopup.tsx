import { ReactRenderer, type Editor } from '@tiptap/react'
import type { SuggestionKeyDownProps, SuggestionOptions, SuggestionProps } from '@tiptap/suggestion'
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'

export interface PopupItem {
  key: string
  label: string
  hint?: string
}

interface ListProps {
  items: PopupItem[]
  command: (item: PopupItem) => void
  empty: string
}

export interface ListHandle {
  onKeyDown(e: KeyboardEvent): boolean
}

const PopupList = forwardRef<ListHandle, ListProps>(function PopupList({ items, command, empty }, ref) {
  const [sel, setSel] = useState(0)
  useEffect(() => setSel(0), [items])
  useImperativeHandle(ref, () => ({
    onKeyDown(e) {
      if (e.key === 'ArrowDown') {
        setSel((s) => (s + 1) % Math.max(items.length, 1))
        return true
      }
      if (e.key === 'ArrowUp') {
        setSel((s) => (s - 1 + items.length) % Math.max(items.length, 1))
        return true
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        const it = items[sel]
        if (it) command(it)
        return !!it
      }
      return false
    }
  }))
  return (
    <ul className="suggest" role="listbox">
      {items.length === 0 && <li className="suggest-empty">{empty}</li>}
      {items.map((it, i) => (
        <li
          key={it.key}
          role="option"
          aria-selected={i === sel}
          className={i === sel ? 'selected' : ''}
          onMouseEnter={() => setSel(i)}
          onMouseDown={(e) => {
            e.preventDefault()
            command(it)
          }}
        >
          <span>{it.label}</span>
          {it.hint && <span className="suggest-hint">{it.hint}</span>}
        </li>
      ))}
    </ul>
  )
})

/** Shared `render` for @tiptap/suggestion: a small list positioned under the cursor. */
export function popupRender(empty: string): SuggestionOptions<PopupItem>['render'] {
  return () => {
    let renderer: ReactRenderer<ListHandle, ListProps> | null = null
    const place = (props: SuggestionProps<PopupItem>): void => {
      const rect = props.clientRect?.()
      const el = renderer?.element as HTMLElement | undefined
      if (!rect || !el) return
      el.style.position = 'fixed'
      el.style.zIndex = '60'
      el.style.left = `${Math.min(rect.left, window.innerWidth - 280)}px`
      const below = rect.bottom + 6
      el.style.top = below + 260 > window.innerHeight ? `${Math.max(8, rect.top - 266)}px` : `${below}px`
    }
    return {
      onStart(props) {
        renderer = new ReactRenderer(PopupList, {
          props: { items: props.items, command: props.command, empty },
          editor: props.editor as Editor
        })
        document.body.appendChild(renderer.element)
        place(props)
      },
      onUpdate(props) {
        renderer?.updateProps({ items: props.items, command: props.command, empty })
        place(props)
      },
      onKeyDown(props: SuggestionKeyDownProps) {
        if (props.event.key === 'Escape') {
          renderer?.destroy()
          renderer?.element.remove()
          renderer = null
          return true
        }
        return renderer?.ref?.onKeyDown(props.event) ?? false
      },
      onExit() {
        renderer?.element.remove()
        renderer?.destroy()
        renderer = null
      }
    }
  }
}
