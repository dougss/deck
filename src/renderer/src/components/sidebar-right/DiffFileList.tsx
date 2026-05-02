import { cn } from '@/lib/utils'
import type { FileChange, FileChangeStatus } from '../../../../shared/ipc'

interface DiffFileListProps {
  files: FileChange[]
  selectedPath: string | null
  onSelect: (path: string) => void
}

const STATUS_LABEL: Record<FileChangeStatus, string> = {
  modified: 'M',
  added: 'A',
  deleted: 'D',
  renamed: 'R',
  untracked: 'U'
}

const STATUS_COLOR: Record<FileChangeStatus, string> = {
  modified: 'text-amber-400',
  added: 'text-emerald-400',
  deleted: 'text-rose-400',
  renamed: 'text-sky-400',
  untracked: 'text-op-zinc-500'
}

function basename(p: string): string {
  const parts = p.split('/')
  return parts[parts.length - 1] || p
}

function dirname(p: string): string {
  const parts = p.split('/')
  if (parts.length <= 1) return ''
  return parts.slice(0, -1).join('/')
}

export function DiffFileList({
  files,
  selectedPath,
  onSelect
}: DiffFileListProps): React.JSX.Element {
  return (
    <ul className="flex-1 overflow-y-auto min-h-0 py-1">
      {files.map((f) => {
        const isSelected = f.path === selectedPath
        const dir = dirname(f.path)
        return (
          <li key={f.path}>
            <button
              type="button"
              onClick={() => onSelect(f.path)}
              className={cn(
                'w-full grid grid-cols-[16px_1fr_auto] items-center gap-2 px-3 py-1.5 text-left transition-colors',
                isSelected
                  ? 'bg-op-zinc-900 text-op-zinc-50'
                  : 'text-op-zinc-300 hover:bg-op-surface-2'
              )}
            >
              <span
                className={cn(
                  'font-mono text-[10.5px] font-semibold uppercase tracking-tight',
                  STATUS_COLOR[f.status]
                )}
                title={f.status}
              >
                {STATUS_LABEL[f.status]}
              </span>
              <span className="min-w-0 flex flex-col leading-tight">
                <span className="font-mono text-[12px] truncate">{basename(f.path)}</span>
                {dir && (
                  <span className="font-mono text-[10px] text-op-zinc-500 truncate">{dir}</span>
                )}
              </span>
              <span className="font-mono text-[10.5px] tabular-nums">
                {f.isBinary ? (
                  <span className="text-op-zinc-500">bin</span>
                ) : (
                  <>
                    {f.added > 0 && <span className="text-emerald-400">+{f.added}</span>}
                    {f.added > 0 && f.deleted > 0 && <span className="text-op-zinc-600"> </span>}
                    {f.deleted > 0 && <span className="text-rose-400">−{f.deleted}</span>}
                  </>
                )}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
