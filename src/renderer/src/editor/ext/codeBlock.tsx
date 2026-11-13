import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from '@tiptap/react'
import { common, createLowlight } from 'lowlight'
import { useState } from 'react'

export const lowlight = createLowlight(common)

const LANGS = ['plaintext', ...lowlight.listLanguages().filter((l) => l !== 'plaintext')]

function CodeBlockView({ node, updateAttributes }: ReactNodeViewProps): React.JSX.Element {
  const [copied, setCopied] = useState(false)
  return (
    <NodeViewWrapper className="code-block">
      <div className="code-toolbar" contentEditable={false}>
        <select
          aria-label="ภาษา"
          value={(node.attrs.language as string) || 'plaintext'}
          onChange={(e) => updateAttributes({ language: e.target.value === 'plaintext' ? null : e.target.value })}
        >
          {LANGS.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
        <button
          className="code-copy"
          aria-label="ก๊อปโค้ด"
          onClick={async () => {
            await navigator.clipboard.writeText(node.textContent)
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
          }}
        >
          {copied ? 'ก๊อปแล้ว' : '📋'}
        </button>
      </div>
      <pre>
        <NodeViewContent<'code'> as="code" />
      </pre>
    </NodeViewWrapper>
  )
}

export const CodeBlock = CodeBlockLowlight.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockView)
  }
}).configure({ lowlight, defaultLanguage: null })
