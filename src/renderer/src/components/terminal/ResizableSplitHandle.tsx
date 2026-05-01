import { useCallback, useEffect, useRef } from 'react'

interface ResizableSplitHandleProps {
  onDrag: (clientY: number) => void
  onCommit: () => void
}

export function ResizableSplitHandle({
  onDrag,
  onCommit
}: ResizableSplitHandleProps): React.JSX.Element {
  const draggingRef = useRef(false)
  const onDragRef = useRef(onDrag)
  const onCommitRef = useRef(onCommit)

  useEffect(() => {
    onDragRef.current = onDrag
    onCommitRef.current = onCommit
  })

  const handleMouseDown = useCallback((e: React.MouseEvent): void => {
    e.preventDefault()
    draggingRef.current = true
    document.body.style.cursor = 'ns-resize'
    document.body.style.userSelect = 'none'

    const onMove = (ev: MouseEvent): void => {
      if (!draggingRef.current) return
      onDragRef.current(ev.clientY)
    }
    const onUp = (): void => {
      if (!draggingRef.current) return
      draggingRef.current = false
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      onCommitRef.current()
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [])

  return (
    <div
      onMouseDown={handleMouseDown}
      className="group relative h-1 w-full cursor-ns-resize"
      style={{ flex: '0 0 auto' }}
    >
      <div className="absolute inset-x-0 top-0 h-[1px] bg-op-border opacity-60 transition-colors duration-100 group-hover:bg-op-accent group-hover:opacity-100" />
    </div>
  )
}
