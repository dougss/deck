export type PtyWriter = (data: string) => void

/**
 * macOS keyboard → ANSI/readline sequence translation.
 * Covers ⌘ and ⌥ combos that macOS intercepts before xterm sees them.
 * Returns false when handled (suppress xterm default), true to pass through.
 *
 * Readline reference:
 * https://www.gnu.org/software/bash/manual/html_node/Bindable-Readline-Commands.html
 */
export function handleMacOSKey(e: KeyboardEvent, write: PtyWriter): boolean {
  // Block all events for Shift+Enter to prevent keypress from leaking \r after keydown writes \x1b\r
  if (e.key === 'Enter' && e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
    if (e.type === 'keydown') write('\x1b\r')
    return false
  }

  if (e.type !== 'keydown') return true

  const meta = e.metaKey && !e.ctrlKey
  const alt = e.altKey && !e.ctrlKey && !e.metaKey

  // ⌘ combos — line navigation, history, kill
  if (meta && !e.altKey && !e.shiftKey) {
    switch (e.key) {
      case 'ArrowLeft':
        write('\x01')
        return false // Ctrl+A — beginning of line
      case 'ArrowRight':
        write('\x05')
        return false // Ctrl+E — end of line
      case 'ArrowUp':
        write('\x10')
        return false // Ctrl+P — previous history
      case 'ArrowDown':
        write('\x0e')
        return false // Ctrl+N — next history
      case 'Backspace':
        write('\x15')
        return false // Ctrl+U — kill line backward
      case 'k':
        write('\x0b')
        return false // Ctrl+K — kill line forward
      case 'l':
        write('\x0c')
        return false // Ctrl+L — clear screen
    }
  }

  // ⌥ combos — word navigation and delete
  if (alt && !e.shiftKey) {
    switch (e.key) {
      case 'ArrowLeft':
        write('\x1bb')
        return false // M-b — backward word
      case 'ArrowRight':
        write('\x1bf')
        return false // M-f — forward word
      case 'Backspace':
        write('\x17')
        return false // Ctrl+W — kill word backward
    }
  }

  return true
}
