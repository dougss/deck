# DEV-14: Remote branches no branch switcher

> Issue: https://github.com/dougss/deck/issues/2
> Mode: refine

## Summary

Adicionar branches remotas (`origin/`) na lista do branch switcher. Ao abrir o popup, o app executa `git fetch` silencioso (com cache de 30s) e exibe local + remoto em grupos separados. Selecionar uma branch remota cria a branch local com tracking automático.

## User Stories

- **US-1** As a developer, I want to see remote branches in the branch switcher, so that I can check out a remote branch without leaving the app.
  - Acceptance: Opening the branch switcher shows two groups — "Local" and "Remote" — when the repo has remote refs. Remote branches appear as `origin/<name>`.
- **US-2** As a developer, I want the fetch to be fast on repeat opens, so that the switcher doesn't feel slow.
  - Acceptance: A second open within 30 seconds of the first uses cached remote refs and does not re-run `git fetch`.
- **US-3** As a developer, I want the switcher to still work when offline or when there is no remote, so that a failed fetch doesn't block me.
  - Acceptance: If `git fetch` times out or fails, the switcher opens with local branches only and no error toast.

## Functional Requirements

- **FR-001** System MUST run `git fetch --quiet origin` (5 s timeout) before listing branches, caching the result per `cwd` for 30 s. Subsequent opens within the TTL skip the fetch.
- **FR-002** System MUST return remote refs via a new IPC method `listBranchesWithRemotes(sessionId)` returning `{ local: string[]; remote: string[] }`. The existing `listBranches` method remains unchanged.
- **FR-003** If `git fetch` fails for any reason (no remote, network error, timeout), the system MUST still return local branches and set `remote: []` — no error propagated to the renderer.
- **FR-004** The branch switcher dropdown MUST display a "Local" section header followed by local branches, then a "Remote" section header followed by remote branches (e.g., `origin/main`). Section headers are non-interactive.
- **FR-005** Search/filter (existing text input) MUST apply across both groups simultaneously.
- **FR-006** Selecting a remote branch entry `origin/<name>` MUST check out the branch as a local tracking branch. Use `git checkout <name>` — git auto-tracks when a matching remote branch exists. If `<name>` already exists locally, switch to it directly.
- **FR-007** The `Cmd+Shift+B` keyboard shortcut behavior is unchanged — it fires the existing `openBranchSwitcherTick` mechanism.
- **FR-008** If the repo has no remote refs (or fetch returns empty), the "Remote" section header MUST NOT be rendered; the UI looks identical to today.

## Non-Functional / Constraints

- **Locked files** (from CLAUDE.md, do not touch): `src/main/pty-manager.ts`, `src/main/pty-registry.ts`, `src/main/session-manager.ts`, `src/main/db/migrations.ts`
- **Stack constraints**: TypeScript strict, no `any`, named exports only, no semicolons, single quotes, `printWidth: 100`, `trailingComma: 'none'`
- **Performance**: `git fetch` timeout capped at 5 s; cache TTL 30 s per `cwd`
- **Dependencies**: No new packages required

## Out of Scope

- Fetching from remotes other than `origin` (first-remote fallback is not required)
- Pushing branches from the switcher
- Showing upstream tracking status or ahead/behind counts
- Auto-refreshing remote list in the background (only on switcher open)
- SSH session support (same guard as today: `session.type === 'ssh'` returns empty)

## Files Affected

### Create
- *(none)*

### Modify
- `src/shared/ipc.ts` — add `GIT_LIST_BRANCHES_WITH_REMOTES` constant; add `GitListBranchesWithRemotesRequest` type and `GitBranchGroups` type; extend `DeckGitApi` with `listBranchesWithRemotes(sessionId: SessionId): Promise<GitBranchGroups>`
- `src/main/git-manager.ts` — add private fetch-cache map; add `fetchRemotes(cwd)` (runs fetch, updates cache); add `listBranchesWithRemotes(cwd)` method that calls `fetchRemotes` then `git branch -r --format=%(refname:short)` for remotes
- `src/main/ipc-handlers-git.ts` — register `ipcMain.handle(IPC.GIT_LIST_BRANCHES_WITH_REMOTES, ...)` delegating to `gitManager.listBranchesWithRemotes(session.cwd)`
- `src/preload/index.ts` — expose `listBranchesWithRemotes(sessionId)` in the `git` namespace under `window.deck`
- `src/renderer/src/components/session/BranchSwitcher.tsx` — change `open()` to call `window.deck.git.listBranchesWithRemotes`; split `branches` state into `localBranches` + `remoteBranches`; render two labelled groups; handle remote-branch checkout by stripping `origin/` prefix before calling existing `checkout()`

### Delete
- *(none)*

## Test Plan

### Automated (Developer + QA run literally)
- `pnpm typecheck` → exit 0
- `pnpm lint` → exit 0, no new warnings

### Manual (QA executes step-by-step)
1. Open a session whose CWD is a git repo with at least one remote branch. Press `Cmd+Shift+B`. → Dropdown opens showing a "Local" group and a "Remote" group with `origin/` prefixed entries.
2. Type part of a remote branch name in the search box. → Both groups filter; only matching entries remain.
3. Click a remote branch that does not yet exist locally. → Switcher closes; session header shows the branch name (without `origin/`); toast confirms switch.
4. Press `Cmd+Shift+B` again within 30 s. → Dropdown opens immediately without a noticeable delay (fetch was cached).
5. Open a session in a repo with no remote configured. Press `Cmd+Shift+B`. → Dropdown opens with only a "Local" group; no "Remote" header; no error toast.
6. Disconnect network, wait for cache to expire (>30 s), then press `Cmd+Shift+B`. → Dropdown opens with local branches only; no error toast shown.

## Open Questions

- **Q1** Cache lives in `GitManager` instance (main process, in-memory). If the app is backgrounded for minutes the cache expires naturally — this is fine. No persistence needed. Recommendation: proceed with in-memory map, no config knob for TTL.
- **Q2** `git checkout <name>` auto-tracking only works when exactly one remote has a matching branch. If multiple remotes have `<name>`, git may prompt. Recommendation: document as known limitation in code comment; do not handle in this issue (rare edge case for a personal tool).
