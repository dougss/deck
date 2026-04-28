import { AppBody } from './components/shell/AppBody'
import { AppShell } from './components/shell/AppShell'
import { StatusBar } from './components/session/StatusBar'
import { TerminalHost } from './components/terminal/TerminalHost'
import { GlobalSessionDialog } from './components/GlobalSessionDialog'
import { CommandPalette } from './components/CommandPalette'
import { ToastProvider } from './components/ui/Toast'
import { useDeckBootstrap } from './hooks/useDeckBootstrap'
import { useDeckShortcuts } from './hooks/useDeckShortcuts'

export function App(): React.JSX.Element {
  useDeckBootstrap()
  useDeckShortcuts()
  return (
    <ToastProvider>
      <AppShell>
        <AppBody>
          {/* border-t + border-l: double-border pattern matching mockup (.terminal css).
              border-l because sidebar is on the left; invert if sidebar moves right. */}
          <div className="flex-1 min-h-0 overflow-hidden border-t border-l border-tv-border">
            <TerminalHost />
          </div>
          <StatusBar />
        </AppBody>
        <GlobalSessionDialog />
        <CommandPalette />
      </AppShell>
    </ToastProvider>
  )
}
