import { useState, useCallback } from 'react'

export interface InlineEditHandle {
  isEditing: boolean
  draft: string
  setDraft: React.Dispatch<React.SetStateAction<string>>
  startEdit: () => void
  confirmEdit: () => string
  cancelEdit: () => void
}

export function useInlineEdit(currentValue: string): InlineEditHandle {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(currentValue)

  const startEdit = useCallback(() => {
    setDraft(currentValue)
    setIsEditing(true)
  }, [currentValue])

  const confirmEdit = useCallback((): string => {
    const trimmed = draft.trim()
    setIsEditing(false)
    return trimmed
  }, [draft])

  const cancelEdit = useCallback(() => {
    setIsEditing(false)
  }, [])

  return { isEditing, draft, setDraft, startEdit, confirmEdit, cancelEdit }
}
