interface DiffPanelFooterProps {
  added: number
  deleted: number
  files: number
}

export function DiffPanelFooter({
  added,
  deleted,
  files
}: DiffPanelFooterProps): React.JSX.Element {
  return (
    <div className="px-3 py-[7px] border-t border-op-border-dim flex items-center justify-between font-mono text-[10.5px] text-op-zinc-500 shrink-0">
      <span>
        {files} {files === 1 ? 'file' : 'files'}
      </span>
      <span className="tabular-nums">
        <span className="text-emerald-400">+{added}</span>{' '}
        <span className="text-rose-400">−{deleted}</span>
      </span>
    </div>
  )
}
