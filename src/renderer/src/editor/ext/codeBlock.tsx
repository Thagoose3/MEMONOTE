import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from '@tiptap/react'
import { common, createLowlight } from 'lowlight'
import { useState } from 'react'

export const lowlight = createLowlight(common)

const LANGS = ['plaintext', ...lowlight.listLanguages().filter((l) => l !== 'plaintext')]

const ALIASES: Record<string, string> = {
  js: 'javascript', jsx: 'javascript', mjs: 'javascript', ts: 'typescript', tsx: 'typescript',
  py: 'python', sh: 'bash', shell: 'bash', zsh: 'bash', html: 'xml', htm: 'xml', svg: 'xml',
  yml: 'yaml', md: 'markdown', cs: 'csharp', 'c++': 'cpp', rb: 'ruby', rs: 'rust', kt: 'kotlin',
  ps: 'powershell', ps1: 'powershell', txt: 'plaintext', text: 'plaintext'
}

/** Canonical language name for the dropdown (```js -> javascript). */
export function canonicalLanguage(lang: string | null | undefined): string {
  if (!lang) return 'plaintext'
  const l = lang.toLowerCase()
  if (LANGS.includes(l)) return l
  return ALIASES[l] ?? l
}

function CodeBlockView({ node, updateAttributes }: ReactNodeViewProps): React.JSX.Element {
  const [copied, setCopied] = useState(false)
  const lang = canonicalLanguage(node.attrs.language as string | null)
  const options = LANGS.includes(lang) ? LANGS : [lang, ...LANGS]
  return (
    <NodeViewWrapper className="code-block">
      <div className="code-toolbar" contentEditable={false}>
        <select
          aria-label="ภาษา"
          value={lang}
          onChange={(e) => updateAttributes({ language: e.target.value === 'plaintext' ? null : e.target.value })}
        >
          {options.map((l) => (
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
