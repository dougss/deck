import { useState } from 'react'
import type { EditorPreset } from '../../../shared/ipc'

const LAST_EDITOR_KEY = 'deck:lastOpenInEditor'

function getLastEditorFromStorage(): EditorPreset {
  if (typeof window === 'undefined') return 'zed'

  const storedValue = localStorage.getItem(LAST_EDITOR_KEY)
  if (storedValue) {
    // Validate against EditorPreset union type
    const validEditors: readonly EditorPreset[] = [
      'zed',
      'cursor',
      'vscode',
      'fork',
      'finder',
      'custom'
    ]
    const isValid = validEditors.includes(storedValue as EditorPreset)

    if (isValid) {
      return storedValue as EditorPreset
    }
  }
  // Fallback to 'zed' if no stored value or invalid
  return 'zed'
}

export function useLastOpenInEditor(): [
  lastEditor: EditorPreset,
  setLastEditor: (editor: EditorPreset) => void
] {
  const [lastEditor, setLastEditorState] = useState<EditorPreset>(() => getLastEditorFromStorage())

  const setLastEditor = (editor: EditorPreset): void => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LAST_EDITOR_KEY, editor)
    }
    setLastEditorState(editor)
  }

  return [lastEditor, setLastEditor]
}
