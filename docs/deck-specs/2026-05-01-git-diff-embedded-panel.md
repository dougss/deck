---
issue: https://github.com/dougss/deck/issues/21
status: ready-for-execution
created: 2026-05-01
phase: F4
---

# Git Diff Embedded Panel

## Goal

Adicionar painel embutido no Deck que mostra o diff do working tree (arquivos modificados desde HEAD) da sessão ativa, com contadores +/− e badge na sidebar, integrado como 3º modo do RightPanel.

## Non-goals

- Histórico de commits / commit-by-commit diff (Warp-style) — fica para v2
- Stage / unstage / discard / commit inline — terminal embutido cobre
- Edição inline no diff
- Comentários / blame
- Suporte a SSH sessions (segue padrão atual: feature desabilitada)
- Suporte a Windows/Linux paths
- Resolução de merge conflicts via UI
- Diff entre branches arbitrárias

## Constraints

- Constitution: subprocess `git` (Princípio 6), zero Rust, TS strict, macOS-only
- ESLint policy: sem `eslint-disable` para silenciar warnings
- Não tocar `pty-manager.ts`, `pty-registry.ts`, `session-manager.ts`, `db/migrations.ts` sem necessidade real
- Performance: `git status` em repos grandes pode levar >1s — debounce + cache obrigatório
- Diffs binários: detectar e não renderizar
- Diffs > N linhas: truncar com "show all"

## Architecture

### Data flow

```
chokidar (.git/index + working tree)
  ↓ debounce 300ms
GitDiffWatcher (per cwd, ref-counted)
  ↓ git status --porcelain=v2 + git diff --numstat
DiffSummary { files: FileChange[], totals: {added, deleted} }
  ↓ IPC broadcast
GIT_DIFF_UPDATED event
  ↓
useDiffStore (zustand) keyed by cwd
  ↓
DiffPanel (renders for active session's cwd)
SessionSidebarItem badge (+X −Y)
```

### Components touched

**Main process:**

- `src/main/git-diff-manager.ts` (new) — runs `git status` / `git diff`, parses output, manages chokidar watchers per cwd with refcount
- `src/main/ipc-handlers-git.ts` — adds 4 handlers (list, getFileDiff, refresh, watch lifecycle)
- `src/main/index.ts` — wire `GitDiffManager` lifecycle (init + dispose on app quit)

**Shared:**

- `src/shared/ipc.ts` — new IPC constants + payload types

**Preload:**

- `src/preload/index.ts` — expose `window.deck.gitDiff.*`

**Renderer:**

- `src/renderer/src/components/sidebar-right/DiffPanel.tsx` (new) — main panel
- `src/renderer/src/components/sidebar-right/DiffPanelHeader.tsx` (new) — header with refresh button
- `src/renderer/src/components/sidebar-right/DiffFileList.tsx` (new) — list of changed files
- `src/renderer/src/components/sidebar-right/DiffViewer.tsx` (new) — wraps `react-diff-viewer-continued`
- `src/renderer/src/components/sidebar-right/DiffPanelFooter.tsx` (new) — totals +/−
- `src/renderer/src/components/sidebar-right/DiffEmptyState.tsx` (new) — empty/non-repo states
- `src/renderer/src/components/sidebar-right/ActivityBar.tsx` — add 3rd icon (`GitBranch` or `GitPullRequest` from lucide)
- `src/renderer/src/components/sidebar-right/RightPanel.tsx` — render DiffPanel when activePanel === 'diff'
- `src/renderer/src/components/sidebar/SessionItem.tsx` (or equivalent) — add diff badge
- `src/renderer/src/stores/deck.ts` — extend `RightPanelMode` with `'diff'`
- `src/renderer/src/stores/diff.ts` (new) — zustand store keyed by cwd
- `src/renderer/src/hooks/useDeckShortcuts.ts` — keyboard shortcut (`Cmd+Shift+G` or similar)

### Types (shared/ipc.ts additions)

```typescript
export type FileChangeStatus = 'modified' | 'added' | 'deleted' | 'renamed' | 'untracked'

export interface FileChange {
  path: string // path relative to repo root
  oldPath?: string // for renames
  status: FileChangeStatus
  staged: boolean
  added: number // lines added (numstat); 0 for binary/untracked
  deleted: number // lines deleted; 0 for binary/untracked
  isBinary: boolean
}

export interface DiffSummary {
  cwd: string
  isRepo: boolean
  files: FileChange[]
  totals: { added: number; deleted: number; files: number }
}

export interface GitDiffWatchRequest {
  cwd: string
}
export interface GitDiffGetFileRequest {
  cwd: string
  path: string
  staged: boolean
}
export interface GitDiffFileResult {
  path: string
  oldContent: string | null // null = untracked or new
  newContent: string | null // null = deleted
  isBinary: boolean
  truncated: boolean
}
export interface GitDiffSummaryUpdatedEvent {
  cwd: string
  summary: DiffSummary
}
```

### IPC channels

```typescript
GIT_DIFF_WATCH_START: 'git-diff:watch-start' // request: GitDiffWatchRequest → DiffSummary
GIT_DIFF_WATCH_STOP: 'git-diff:watch-stop' // request: GitDiffWatchRequest → void
GIT_DIFF_GET_FILE: 'git-diff:get-file' // request: GitDiffGetFileRequest → GitDiffFileResult
GIT_DIFF_REFRESH: 'git-diff:refresh' // request: GitDiffWatchRequest → DiffSummary
GIT_DIFF_SUMMARY_UPDATED: 'git-diff:summary-updated' // event: GitDiffSummaryUpdatedEvent
```

### GitDiffManager design

- `Map<cwd, WatcherEntry>` with refcount
- `WatcherEntry { watcher: FSWatcher, refCount: number, lastSummary: DiffSummary, debouncedRefresh: () => void }`
- On `watchStart(cwd)`: increment refcount; if first, create chokidar watcher on:
  - `${gitDir}/index` (resolved via `git rev-parse --git-dir`)
  - working tree (cwd) ignoring `node_modules/**`, `.git/**`, `dist/**`, `.next/**`, `build/**`
- On `watchStop(cwd)`: decrement; if 0, close watcher
- On any event: `debounce(300ms) → computeSummary(cwd) → broadcast`
- `computeSummary(cwd)`:
  1. `git status --porcelain=v2 -uall` → parse status (M/A/D/R/?) + staged flag
  2. `git diff --numstat HEAD` → added/deleted per file (ignores untracked)
  3. `git diff --numstat --cached` → added/deleted for staged
  4. Merge: each file gets totals across staged+unstaged; binary marker = numstat returns `-\t-`
- Cache TTL: 500ms (collapse rapid events)
- Cancel inflight `git status` if new trigger arrives

### react-diff-viewer-continued

Lib: `react-diff-viewer-continued` (~30kb gzip, last published 2024, MIT, supports React 19).

Verify React 19 peer compat at install. Fallback: `diff` + custom Tailwind renderer.

Theming: pass `styles` prop with `op-*` tokens to match Deck design system.

## Files

### Create

- `src/main/git-diff-manager.ts`
- `src/main/git-diff-manager.test.ts` (vitest, parser unit tests)
- `src/renderer/src/components/sidebar-right/DiffPanel.tsx`
- `src/renderer/src/components/sidebar-right/DiffPanelHeader.tsx`
- `src/renderer/src/components/sidebar-right/DiffFileList.tsx`
- `src/renderer/src/components/sidebar-right/DiffViewer.tsx`
- `src/renderer/src/components/sidebar-right/DiffPanelFooter.tsx`
- `src/renderer/src/components/sidebar-right/DiffEmptyState.tsx`
- `src/renderer/src/stores/diff.ts`

### Modify

- `src/shared/ipc.ts` — add types + IPC constants
- `src/preload/index.ts` — expose `window.deck.gitDiff`
- `src/main/ipc-handlers-git.ts` — register diff handlers
- `src/main/index.ts` — instantiate `GitDiffManager`, dispose on quit
- `src/renderer/src/stores/deck.ts` — `RightPanelMode = 'planner' | 'terminal' | 'diff'`
- `src/renderer/src/components/sidebar-right/ActivityBar.tsx` — 3rd icon
- `src/renderer/src/components/sidebar-right/RightPanel.tsx` — render `<DiffPanel />` for `'diff'` mode
- `src/renderer/src/components/sidebar/SessionItem.tsx` (or wherever session row renders) — diff badge
- `src/renderer/src/hooks/useDeckShortcuts.ts` — `Cmd+Shift+G` toggles diff panel
- `package.json` — add `react-diff-viewer-continued`

### Delete

None.

## Tasks

Each task must be 2-5min when executed; ordered for incremental progress; TDD where logic exists.

- [ ] **T1** — Add types + IPC constants to `src/shared/ipc.ts` (no behavior change; typecheck must pass)
- [ ] **T2** — Write `git-diff-manager.test.ts` with parser fixtures: porcelain v2 output (modified/added/deleted/renamed/untracked + staged combos), numstat output (text + binary)
- [ ] **T3** — Implement parser functions in `git-diff-manager.ts` (parsePorcelainV2, parseNumstat, mergeFileChanges) — make T2 green
- [ ] **T4** — Implement `GitDiffManager` class: `computeSummary(cwd)` running git commands; unit-test against a fixture repo created in tmpdir
- [ ] **T5** — Add chokidar watcher with refcount + debounce + ignore patterns; test ref counting + dispose
- [ ] **T6** — Wire `getFileDiff(cwd, path, staged)` reading file content via `git show :file` (staged) / `git show HEAD:file` (committed) / fs read (working); detect binary
- [ ] **T7** — Register IPC handlers in `ipc-handlers-git.ts`; expose via preload
- [ ] **T8** — Run `pnpm typecheck && pnpm lint` — fix issues
- [ ] **T9** — Add `react-diff-viewer-continued` to package.json; verify React 19 peer compat (`pnpm install`); if incompat, STOP and report
- [ ] **T10** — Create `useDiffStore` (zustand): state keyed by cwd, watch lifecycle
- [ ] **T11** — Extend `RightPanelMode`; add `'diff'` icon (`GitPullRequest` lucide) in `ActivityBar.tsx`
- [ ] **T12** — Build `DiffEmptyState.tsx`: 3 variants (not a repo / no changes / SSH session)
- [ ] **T13** — Build `DiffPanelHeader.tsx`: title "Changes", refresh button, file count
- [ ] **T14** — Build `DiffFileList.tsx`: virtualized list (use existing project pattern or `react-window` only if list >50; otherwise plain map); status icon per file (M/A/D/R/U); +X/−Y per file
- [ ] **T15** — Build `DiffViewer.tsx`: wraps `react-diff-viewer-continued` with Deck theme tokens; binary fallback ("Binary file"); truncation at 2000 lines with "Show all"
- [ ] **T16** — Build `DiffPanelFooter.tsx`: total +/− across files
- [ ] **T17** — Compose `DiffPanel.tsx`: header + file list (top) + viewer (bottom) with vertical resize between them; selected file state
- [ ] **T18** — Wire `DiffPanel` into `RightPanel.tsx`
- [ ] **T19** — Add `Cmd+Shift+G` shortcut in `useDeckShortcuts.ts`
- [ ] **T20** — Add diff badge to `SessionItem.tsx`: `+X −Y` muted when zero, accent when changes; tooltip "X files changed"
- [ ] **T21** — Subscribe useDiffStore to active session's cwd; auto start/stop watcher on session switch + panel open
- [ ] **T22** — Run `pnpm typecheck && pnpm lint && pnpm test` — fix issues
- [ ] **T23** — Smoke: launch `pnpm dev`, run scenarios in Test plan; report findings

## Test plan

### Automated

- Unit: parser fns (porcelain v2, numstat, binary detection) — fixtures cover M/A/D/R/U + staged matrix
- Unit: refcount in `GitDiffManager` (start/start/stop → still watching; stop → closed)
- Unit: debounce coalesces rapid events
- Type: `pnpm typecheck` passes
- Lint: `pnpm lint` zero warnings (no disable lines added)

### Manual scenarios (Douglas runs)

1. **Empty state — non-repo cwd**: open shell session in `/tmp`, switch to diff panel → "Not a git repository"
2. **Empty state — clean repo**: open Deck repo session, no changes → "No changes"
3. **Modified file**: edit `README.md`, panel updates within 1s, file appears com `+X −Y`
4. **New file**: `touch foo.ts && echo "x" > foo.ts` → appears as `Untracked` com badge `U`
5. **Deleted file**: `rm src/.../some-file.tsx` → appears com status `D`, full red diff
6. **Renamed file**: `git mv a b` → status `R`, both paths shown
7. **Staged + unstaged on same file**: `git add` partial, edit more → totais refletem ambos
8. **Binary file**: copy a `.png` → "Binary file" message, no render attempt
9. **Large diff (>2000 lines)**: lockfile change → truncated com "Show all" button
10. **Refresh button**: works manually
11. **Watcher debounce**: rapid edits (`while true; do echo x >> f; done` for 1s) → no UI thrash, single update
12. **Multi-session same cwd**: 2 sessions same workspace → both reflect; closing one keeps watcher (refcount)
13. **Multi-session different cwd**: switching sessions swaps content within 200ms
14. **Worktree**: session cwd is a `git worktree`, not main → still works
15. **SSH session**: switch to SSH session → "Not available for SSH sessions" empty state
16. **Badge on sidebar**: `+X −Y` muted updates without panel open
17. **Cmd+Shift+G**: toggles diff panel, focuses it
18. **Activity bar 3rd icon**: clicking activates panel, accent indicator visible
19. **Reload (Cmd+R)**: state restores, watcher rewires
20. **Quit (Cmd+Q)**: no chokidar leak, no zombie git processes

## Rollback

- Revert single PR: feature is fully additive (new files + small extends)
- No DB migration introduced — no rollback path needed there
- `package.json` revert to drop `react-diff-viewer-continued`
- `RightPanelMode` reverts to `'planner' | 'terminal'` — no persisted state breaks since panel mode isn't persisted across versions in a load-bearing way (verify in T22)

## Open questions

- **Vertical resize between file list and viewer**: hard split 40/60 vs draggable. Recommendation: hard split in MVP; draggable in v2 if friction.
- **Side-by-side vs unified diff toggle**: lib supports both. MVP: unified (more compact for narrow right panel). Toggle in v2.
- **Syntax highlighting**: `react-diff-viewer-continued` accepts a `renderContent` for prism/shiki integration. MVP: plain monospace, no highlight (keeps bundle light, ships faster). Add highlight in v2 if Douglas miss it during daily-drive.
- **Badge in sidebar tree**: at session level or also at workspace level (sum of children)? MVP: session level only.
- **Stale watch on session deletion**: confirm refcount drops to 0 when last subscriber disappears (T5 must cover).
