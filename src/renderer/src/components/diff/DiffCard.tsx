import { DiffEditor } from '@monaco-editor/react'
import type { FileDiffPayload } from '@shared/types'
import { languageForFile } from '@/lib/monaco'

interface Props {
  diff: FileDiffPayload
  height?: string
}

export default function DiffCard({ diff, height = '55vh' }: Props): React.JSX.Element {
  return (
    <div className="border border-border rounded overflow-hidden" style={{ height }}>
      <DiffEditor
        original={diff.oldContent}
        modified={diff.newContent}
        language={languageForFile(diff.filePath)}
        theme="cc-dark"
        options={{
          readOnly: true,
          renderSideBySide: true,
          minimap: { enabled: false },
          fontSize: 12,
          fontFamily: "'Cascadia Code', 'JetBrains Mono', Consolas, monospace",
          scrollBeyondLastLine: false,
          automaticLayout: true,
          renderOverviewRuler: false,
          hideUnchangedRegions: { enabled: true }
        }}
      />
    </div>
  )
}
