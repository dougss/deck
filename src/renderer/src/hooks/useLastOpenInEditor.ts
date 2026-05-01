import { useState } from 'react'

type EditorPreset = 'zed' | 'cursor' | 'vscode' | 'fork' | 'custom'

const LAST_EDITOR_KEY = 'deck:lastOpenInEditor'
const DEFAULT_EDITOR: EditorPreset = 'zed'

function getInitialEditor(): EditorPreset {
  if (typeof window === 'undefined') return DEFAULT_EDITOR

  const saved = localStorage.getItem(LAST_EDITOR_KEY)
  if (saved) {
    const isValidEditor = ['zed', 'cursor', 'vscode', 'fork', 'custom'].includes(saved)
    return isValidEditor ? (saved as EditorPreset) : DEFAULT_EDITOR
  }
  return DEFAULT_EDITOR
}

export function useLastOpenInEditor(): readonly [EditorPreset, (editor: EditorPreset) => void] {
  const [lastEditor, setLastEditor] = useState<EditorPreset>(getInitialEditor)

  const updateLastEditor = (editor: EditorPreset): void => {
    setLastEditor(editor)
    if (typeof window !== 'undefined') {
      localStorage.setItem(LAST_EDITOR_KEY, editor)
    }
  }

  return [lastEditor, updateLastEditor] as const
}
