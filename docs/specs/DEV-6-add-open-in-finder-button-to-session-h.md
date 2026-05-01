# Add 'Open in Finder' button to session header — spec

> Issue: DEV-6

## Goal

Add a small icon button to `SessionHeader` that opens the active session's
working directory in macOS Finder. The button lives in the right-side action
cluster (next to `BranchSwitcher`, `ConfigBadge`, and the existing "More
options" button) and uses `Lucide FolderOpen` at 16px with hover styling that
matches `IconButton`. This gives the user a one-click way to jump from a
session to the underlying folder in Finder, the same affordance currently only
available via session right-click in the sidebar context menu.

## Non-goals

- No changes to right-click context menus or sidebar `SessionItem` behavior.
- No "Reveal in Finder" of arbitrary files (only the session `cwd`).
- No Windows/Linux path handling — macOS-only, consistent with existing
  `Constraints` in `CLAUDE.md`.
- No new settings, preferences, or telemetry.
- No keyboard shortcut binding in this issue.

## Constraints

- Locked files (from `CLAUDE.md` "Don't touch without asking" — repeat verbatim):
  - `src/main/pty-manager.ts` — PTY spawn + lifecycle, fragile timing
  - `src/main/pty-registry.ts` — PTY instance map, shutdown ordering
  - `src/main/session-manager.ts` — core session logic, planner attachment rules
  - `src/main/db/migrations.ts` — append-only; never edit existing migrations
- Convention rules (from `CLAUDE.md` "Code conventions"):
  - TypeScript strict, no `any` unless justified.
  - Functional style, named exports only.
  - Conventional commits (`feat:`, `fix:`, etc.).
  - Prettier enforced: single quotes, no semicolons, `printWidth: 100`,
    `trailingComma: 'none'` (`.prettierrc.yaml`).
  - Run `pnpm typecheck && pnpm lint` before commit.
- Architecture rules (from `CLAUDE.md` "Architecture"):
  - IPC channel constants live in `src/shared/ipc.ts`, imported on both sides.
  - System-domain handlers live in `src/main/ipc-handlers-system.ts`.
  - Renderer talks to main only through the typed `window.deck.*` API exposed
    by `src/preload/index.ts`.
- Stack constraints: Electron 39, React 19, lucide-react ^1.8.0, Tailwind v4 —
  all already in `package.json`. No new dependencies required.

## Architecture

The issue description assumes `shell.openPath` is already wired through
`window.deck.system`. **It is not.** Today `DeckSystemApi` only exposes
`openInEditor` and `openExternal` (verified at
`src/shared/ipc.ts:286-291`, `src/preload/index.ts:251-258`,
`src/main/ipc-handlers-system.ts`). `shell.openPath` is the correct Electron
API to open a directory in Finder (`shell.openExternal` only takes URLs and
would require a `file://` prefix; `openPath` is the documented, idiomatic
choice).

So we add one new IPC channel end-to-end and a small renderer button:

```
+---------------------+        IPC.SYSTEM_OPEN_PATH         +-------------------------+
| SessionHeader.tsx   |  ------------------------------->   | ipc-handlers-system.ts  |
|  IconButton (Folder |                                     |  shell.openPath(p)      |
|  Open) onClick      |  <-------------------------------   |                         |
+---------------------+         Promise<void>               +-------------------------+
         |                                                            |
         | window.deck.system.openPath(session.cwd)                   v
         v                                                       macOS Finder
   src/preload/index.ts
   (DeckSystemApi.openPath)
```

`shell.openPath(path)` returns `Promise<string>` — empty string on success,
error message on failure. We surface as `Promise<void>` to the renderer (drop
the error string for now; matches the existing fire-and-forget pattern of
`openInEditor` in `SessionItem.tsx:74`). Failures are logged in main with
`console.error`, consistent with `openInEditor` error handling.

The button is rendered conditionally only when there's an active session and
workspace (the same guard `SessionHeader` already uses). For SSH sessions,
`session.cwd` is a remote path — opening it in local Finder makes no sense, so
the button is hidden when `session.type === 'ssh'` (mirrors how
`BranchSwitcher` is also hidden for SSH at `SessionHeader.tsx:76`).

## Files

### Modify

- `src/shared/ipc.ts` — add `SYSTEM_OPEN_PATH: 'system:open-path'` to the
  `IPC` channels object (alongside `SYSTEM_OPEN_IN_EDITOR` and
  `SYSTEM_OPEN_EXTERNAL` near line 50–51), and add
  `openPath(path: string): Promise<void>` to `DeckSystemApi` (near line
  289–291).
- `src/main/ipc-handlers-system.ts` — register
  `ipcMain.handle(IPC.SYSTEM_OPEN_PATH, ...)` that calls `shell.openPath(path)`,
  logs non-empty error strings via `console.error('[system] openPath: ...')`,
  and resolves to `void`. `shell` is already imported from `electron` at the
  top of the file.
- `src/preload/index.ts` — add `openPath(path)` inside the `system: { ... }`
  block (around line 251–258), invoking `IPC.SYSTEM_OPEN_PATH`.
- `src/renderer/src/components/session/SessionHeader.tsx` — import
  `FolderOpen` from `lucide-react`, add an `IconButton` with
  `label="Open in Finder"` inside the right-side cluster (between
  `ConfigBadge` and the existing "More options" `IconButton` at line 83–99),
  hidden when `session.type === 'ssh'`. The icon uses `size={16}` (matches
  the 16px "More options" SVG already in that cluster); `strokeWidth` follows
  the lucide default so the visual weight matches sibling buttons. `onClick`
  calls `void window.deck.system.openPath(session.cwd)`.

### Create

- None.

### Delete

- None.

## Tasks

Ordered, dependency-aware. Each task should leave typecheck + lint green.

- [ ] **T1** — Extend the IPC contract: add `SYSTEM_OPEN_PATH` channel
      constant and `openPath(path: string): Promise<void>` on
      `DeckSystemApi` in `src/shared/ipc.ts`.
- [ ] **T2** — Implement the main-process handler in
      `src/main/ipc-handlers-system.ts` using `shell.openPath`. Log
      non-empty error returns. No new imports beyond the existing `shell`.
- [ ] **T3** — Bridge it in `src/preload/index.ts` by adding `openPath`
      inside the `system` object so the `satisfies DeckSystemApi` check
      passes.
- [ ] **T4** — Run `pnpm typecheck` to confirm shared/main/preload contract
      lines up before touching the renderer.
- [ ] **T5** — Update `src/renderer/src/components/session/SessionHeader.tsx`:
      import `FolderOpen` from `lucide-react`, render an `IconButton`
      with `label="Open in Finder"` placed before the existing "More
      options" button, conditioned on `session.type !== 'ssh'`, wired to
      `void window.deck.system.openPath(session.cwd)`.
- [ ] **T6** — Run `pnpm typecheck && pnpm lint`. Fix any drift.
- [ ] **T7** — Manual smoke (see Test plan / Manual). Confirm Finder
      window opens at the expected path for a local session, and that the
      button does not render for an SSH session.

## Test plan

### Manual

1. **Happy path (Claude Code session):** Start `pnpm dev`, attach to a
   Claude Code session whose `cwd` exists locally. Click the new
   `FolderOpen` icon in `SessionHeader`. A Finder window opens at the
   session's working directory. The session view is otherwise unchanged.
2. **Happy path (shell session):** Same as above for a `shell`-type
   session. Button is visible and works.
3. **SSH session:** Open or attach to an SSH session. Button is **not**
   rendered (parallel to how `BranchSwitcher` is hidden for SSH).
4. **Hover state:** Hover the button — it shows the same hover treatment
   as the existing "More options" `IconButton` immediately to its right
   (no extra CSS, just the shared `IconButton` component).
5. **Missing/invalid cwd:** Manually edit a session row in DB so
   `cwd` points to a non-existent path. Click the button. No crash;
   `[system] openPath:` error message is logged once in the main-process
   console (visible via `electron-vite dev` terminal output). UI
   continues to work.
6. **No active session:** With no session selected, `SessionHeader` shows
   the "No session active" placeholder branch and the new button is
   absent (because the early-return path doesn't render the action
   cluster).

### Automated

- `pnpm typecheck` — both `typecheck:node` and `typecheck:web` pass; the
  new IPC types align across `src/shared`, `src/main`, `src/preload`.
- `pnpm lint` — clean. No `any`, no semicolons, single quotes, etc.
- Existing smoke tests (`pnpm db:smoke`, `pnpm session:smoke`) are not
  affected by this change but should still pass — run if the IPC
  registration touch causes any concern.

## Rollback

Single-feature, additive change. To revert:

1. Remove the `IconButton` block and `FolderOpen` import from
   `src/renderer/src/components/session/SessionHeader.tsx`.
2. Remove the `openPath` member from
   `src/preload/index.ts` (the `system` block) and from `DeckSystemApi`
   in `src/shared/ipc.ts`.
3. Remove the `IPC.SYSTEM_OPEN_PATH` channel constant in
   `src/shared/ipc.ts` and the matching `ipcMain.handle` block in
   `src/main/ipc-handlers-system.ts`.

No DB migrations, settings, or persisted state are touched, so a
revert/PR-revert is safe at any time.

## Open questions

- **Q1: Hide for SSH or show as disabled with a tooltip?**
  Recommend: hide entirely (matches `BranchSwitcher` precedent at
  `SessionHeader.tsx:76`). Reduces clutter and avoids the question of
  whether to attempt to map remote → local paths.
- **Q2: Reuse `openExternal` with `file://` prefix instead of adding a
  new IPC?**
  Recommend: add the new IPC. `shell.openPath` is the documented Electron
  API for paths, returns a typed error string, and avoids URL-encoding
  edge cases on `cwd` values that contain spaces or special characters.
  The cost is small (~10 lines across three files) and the surface is
  reused by any future "reveal folder" affordance.
- **Q3: Should the button live before or after `BranchSwitcher`?**
  Recommend: place it between `ConfigBadge` and the "More options"
  button. Keeping branch info adjacent to the cwd label preserves the
  current scan order (workspace → session → branch → config → actions),
  and groups the new action with the existing `IconButton`.
