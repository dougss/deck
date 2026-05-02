import { useEffect, useMemo, useState } from 'react'
import { useActiveSession } from '@/stores/deck'
import { useDiffStore, useDiffSummary, useSelectedDiffFile } from '@/stores/diff'
import { DiffEmptyState } from './DiffEmptyState'
import { DiffPanelHeader } from './DiffPanelHeader'
import { DiffPanelFooter } from './DiffPanelFooter'
import { DiffFileList } from './DiffFileList'
import { DiffViewer } from './DiffViewer'

export function DiffPanel(): React.JSX.Element {
  const session = useActiveSession()
  const cwd = session?.cwd ?? null
  const isSsh = session?.type === 'ssh'

  const watch = useDiffStore((s) => s.watch)
  const unwatch = useDiffStore((s) => s.unwatch)
  const refresh = useDiffStore((s) => s.refresh)
  const selectFile = useDiffStore((s) => s.selectFile)

  const summary = useDiffSummary(cwd)
  const selectedPath = useSelectedDiffFile(cwd)

  const [refreshing, setRefreshing] = useState(false)

  // Watch the active session's cwd
  useEffect(() => {
    if (!cwd || isSsh) return
    void watch(cwd)
    return () => {
      void unwatch(cwd)
    }
  }, [cwd, isSsh, watch, unwatch])

  // Auto-select first file when summary changes
  useEffect(() => {
    if (!cwd || !summary) return
    if (selectedPath && summary.files.some((f) => f.path === selectedPath)) return
    const first = summary.files[0]?.path ?? null
    selectFile(cwd, first)
  }, [cwd, summary, selectedPath, selectFile])

  const selectedFile = useMemo(
    () => summary?.files.find((f) => f.path === selectedPath) ?? null,
    [summary, selectedPath]
  )

  const handleRefresh = async (): Promise<void> => {
    if (!cwd) return
    setRefreshing(true)
    try {
      await refresh(cwd)
    } finally {
      setRefreshing(false)
    }
  }

  if (!session) {
    return (
      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        <DiffEmptyState variant="no-session" />
      </div>
    )
  }
  if (isSsh) {
    return (
      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        <DiffEmptyState variant="ssh" />
      </div>
    )
  }
  if (!summary) {
    return (
      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        <DiffEmptyState variant="loading" />
      </div>
    )
  }
  if (!summary.isRepo) {
    return (
      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        <DiffEmptyState variant="not-repo" />
      </div>
    )
  }
  if (summary.files.length === 0) {
    return (
      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        <DiffPanelHeader fileCount={0} busy={refreshing} onRefresh={handleRefresh} />
        <DiffEmptyState variant="no-changes" />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <DiffPanelHeader
        fileCount={summary.files.length}
        busy={refreshing}
        onRefresh={handleRefresh}
      />
      <div className="flex-1 min-h-0 min-w-0 grid grid-rows-[40%_60%]">
        <div className="border-b border-op-border min-h-0 min-w-0 flex flex-col">
          <DiffFileList
            files={summary.files}
            selectedPath={selectedPath}
            onSelect={(path) => cwd && selectFile(cwd, path)}
          />
        </div>
        <div className="min-h-0 min-w-0">
          {selectedFile && cwd ? (
            <DiffViewer cwd={cwd} file={selectedFile} />
          ) : (
            <DiffEmptyState variant="no-changes" />
          )}
        </div>
      </div>
      <DiffPanelFooter
        added={summary.totals.added}
        deleted={summary.totals.deleted}
        files={summary.totals.files}
      />
    </div>
  )
}
