// Bundle Monaco locally (no CDN) and register the warm dark theme.
import * as monaco from 'monaco-editor'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import { loader } from '@monaco-editor/react'

self.MonacoEnvironment = {
  getWorker: () => new editorWorker()
}

loader.config({ monaco })

monaco.editor.defineTheme('cc-dark', {
  base: 'vs-dark',
  inherit: true,
  rules: [],
  colors: {
    'editor.background': '#14130f',
    'editor.foreground': '#c9c7c2',
    'diffEditor.insertedTextBackground': '#7da87b26',
    'diffEditor.removedTextBackground': '#c95f4c26',
    'diffEditor.insertedLineBackground': '#7da87b14',
    'diffEditor.removedLineBackground': '#c95f4c14',
    'editorLineNumber.foreground': '#5f5c55',
    'editor.lineHighlightBackground': '#1e1c18'
  }
})

const EXT_TO_LANG: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  json: 'json',
  css: 'css',
  scss: 'scss',
  less: 'less',
  html: 'html',
  htm: 'html',
  xml: 'xml',
  md: 'markdown',
  py: 'python',
  rb: 'ruby',
  rs: 'rust',
  go: 'go',
  java: 'java',
  c: 'c',
  h: 'c',
  cpp: 'cpp',
  hpp: 'cpp',
  cs: 'csharp',
  php: 'php',
  sql: 'sql',
  sh: 'shell',
  bash: 'shell',
  ps1: 'powershell',
  yml: 'yaml',
  yaml: 'yaml',
  toml: 'ini',
  ini: 'ini',
  dockerfile: 'dockerfile',
  vue: 'html',
  svelte: 'html'
}

export function languageForFile(filePath: string): string {
  const name = filePath.split(/[\\/]/).pop() ?? ''
  if (name.toLowerCase() === 'dockerfile') return 'dockerfile'
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  return EXT_TO_LANG[ext] ?? 'plaintext'
}
