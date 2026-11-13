import { Node, mergeAttributes } from '@tiptap/core'
import { NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from '@tiptap/react'
import { useEffect, useRef, useState } from 'react'

let focusNextLabel = false

function CopyFieldView({ node, updateAttributes }: ReactNodeViewProps): React.JSX.Element {
  const [copied, setCopied] = useState(false)
  const labelRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (focusNextLabel) {
      focusNextLabel = false
      labelRef.current?.focus()
    }
  }, [])
  return (
    <NodeViewWrapper className="copy-field" data-type="copy-field">
      <span className="copy-icon" contentEditable={false}>🔑</span>
      <input
        ref={labelRef}
        className="copy-label"
        placeholder="ชื่อ"
        value={(node.attrs.label as string) ?? ''}
        onChange={(e) => updateAttributes({ label: e.target.value })}
      />
      <input
        className="copy-value"
        placeholder="ค่า"
        spellCheck={false}
        value={(node.attrs.value as string) ?? ''}
        onChange={(e) => updateAttributes({ value: e.target.value })}
      />
      <button
        className="copy-btn"
        aria-label="ก๊อปค่า"
        onClick={async () => {
          await navigator.clipboard.writeText((node.attrs.value as string) ?? '')
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        }}
      >
        {copied ? 'ก๊อปแล้ว' : '📋'}
      </button>
    </NodeViewWrapper>
  )
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    copyField: { insertCopyField: () => ReturnType }
  }
}

export const CopyField = Node.create({
  name: 'copyField',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,
  addAttributes() {
    return {
      label: { default: '', parseHTML: (el) => el.getAttribute('data-label') ?? '' },
      value: { default: '', parseHTML: (el) => el.getAttribute('data-value') ?? '' }
    }
  },
  parseHTML() {
    return [{ tag: 'div[data-type="copy-field"]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes({ 'data-type': 'copy-field', 'data-label': HTMLAttributes.label, 'data-value': HTMLAttributes.value }),
      `${HTMLAttributes.label ?? ''}: ${HTMLAttributes.value ?? ''}`
    ]
  },
  addNodeView() {
    return ReactNodeViewRenderer(CopyFieldView)
  },
  addCommands() {
    return {
      insertCopyField:
        () =>
        ({ chain }) => {
          focusNextLabel = true
          return chain().insertContent([{ type: 'copyField' }, { type: 'paragraph' }]).run()
        }
    }
  },
  addKeyboardShortcuts() {
    return { 'Mod-Shift-k': () => this.editor.commands.insertCopyField() }
  }
})
