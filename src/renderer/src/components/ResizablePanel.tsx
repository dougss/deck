import { useRef, useCallback, useEffect } from 'react'
import { useResizablePanelWidth } from '@/hooks/useResizablePanelWidth'

export interface ResizablePanelProps {
  side: 'left' | 'right'
  storageKey: string
  defaultWidth: number
  minWidth: number
  getMaxWidth?: () => number
  onWidthChange?: (width: number) => void
  onWidthCommit?: (width: number) => void
  className?: string
  children: React.ReactNode
}

export function ResizablePanel({
  side,
  storageKey,
  defaultWidth,
  minWidth,
  getMaxWidth,
  onWidthChange,
  onWidthCommit,
  className = '',
  children
}: ResizablePanelProps): React.JSX.Element {
  const { width, setWidthCommitted, resetToDefault } = useResizablePanelWidth({
    storageKey,
    defaultWidth,
    minWidth,
    getMaxWidth
  })

  const containerRef = useRef<HTMLDivElement>(null)
  const widthRef = useRef<number>(width)
  const isDragging = useRef<boolean>(false)
  const startXRef = useRef<number>(0)
  const startWidthRef = useRef<number>(0)
  const onWidthChangeRef = useRef(onWidthChange)
  const onWidthCommitRef = useRef(onWidthCommit)
  const handleMouseMoveRef = useRef<(e: MouseEvent) => void>(() => {})
  const handleMouseUpRef = useRef<() => void>(() => {})

  useEffect(() => {
    onWidthChangeRef.current = onWidthChange
    onWidthCommitRef.current = onWidthCommit
  }, [onWidthChange, onWidthCommit])

  // Keep widthRef in sync with committed state (e.g. window resize clamp)
  useEffect(() => {
    widthRef.current = width
  }, [width])

  const getMax = useCallback((): number => {
    return getMaxWidth ? getMaxWidth() : Math.max(minWidth, Math.floor(window.innerWidth * 0.5))
  }, [getMaxWidth, minWidth])

  const handleMouseMove = useCallback(
    (e: MouseEvent): void => {
      if (!isDragging.current || !containerRef.current) return
      const delta = side === 'left' ? e.clientX - startXRef.current : startXRef.current - e.clientX
      const newWidth = Math.min(Math.max(startWidthRef.current + delta, minWidth), getMax())
      widthRef.current = newWidth
      containerRef.current.style.width = `${newWidth}px`
      onWidthChangeRef.current?.(newWidth)
    },
    [side, minWidth, getMax]
  )

  const handleMouseUp = useCallback((): void => {
    if (!isDragging.current) return
    isDragging.current = false
    document.removeEventListener('mousemove', handleMouseMoveRef.current)
    document.removeEventListener('mouseup', handleMouseUpRef.current)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    setWidthCommitted(widthRef.current)
    onWidthCommitRef.current?.(widthRef.current)
  }, [setWidthCommitted])

  useEffect(() => {
    handleMouseMoveRef.current = handleMouseMove
    handleMouseUpRef.current = handleMouseUp
  }, [handleMouseMove, handleMouseUp])

  const handleMouseDown = useCallback((e: React.MouseEvent): void => {
    e.preventDefault()
    isDragging.current = true
    startXRef.current = e.clientX
    startWidthRef.current = widthRef.current
    document.body.style.cursor = 'ew-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', handleMouseMoveRef.current)
    document.addEventListener('mouseup', handleMouseUpRef.current)
  }, [])

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent): void => {
      e.preventDefault()
      resetToDefault()
      if (containerRef.current) {
        containerRef.current.style.width = `${defaultWidth}px`
      }
      onWidthChangeRef.current?.(defaultWidth)
      onWidthCommitRef.current?.(defaultWidth)
    },
    [resetToDefault, defaultWidth]
  )

  const handlePosition = side === 'left' ? 'right-0' : 'left-0'
  const indicatorMargin = side === 'left' ? 'ml-[1px]' : 'mr-[1px]'

  return (
    <div ref={containerRef} className={className} style={{ width: `${width}px` }}>
      {children}
      {/* Drag handle — 4px invisible hit area on the inner edge */}
      <div
        className={`absolute top-0 ${handlePosition} h-full w-1 z-20 cursor-ew-resize group`}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
      >
        <div
          className={`h-full w-[2px] ${indicatorMargin} transition-colors duration-100 group-hover:bg-op-border`}
        />
      </div>
    </div>
  )
}
