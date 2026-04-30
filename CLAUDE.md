# Deck — Claude Code Instructions

> Multi-session Claude Code orchestrator for macOS. Electron desktop app.

## Stack

- Electron 39 + electron-vite 5 + Vite 7
- Node 22 LTS, TypeScript 5.9 (strict)
- React 19 + Tailwind CSS v4
- Radix primitives + shadcn-style components (cva, clsx, tailwind-merge, lucide-react)
- xterm.js 6 (terminal emulation) + node-pty 1.1 (PTY)
- better-sqlite3 12 (persistence)
- Zustand 5 (renderer state)
- chokidar 5 (event file watcher)

## Commands

- `pnpm dev` — start in development mode
- `pnpm build` — typecheck + electron-vite build
- `pnpm build:mac` — build .dmg/.zip for macOS x64 (~3-5min)
- `pnpm typecheck` — TS check (node + web split)
- `pnpm lint` — ESLint
- `pnpm format` — Prettier
- `./scripts/release-local.sh` — build + install locally for daily-drive testing

### Smoke tests

CLI smoke tests boot Electron headless with `--deck-smoke=<kind>`:

- `pnpm db:smoke` — migrations + sessions table
- `pnpm ws:smoke` — workspace manager
- `pnpm session:smoke` — session manager + PTY lifecycle

## Setup (one-time)

- `./scripts/install-hooks.sh` installs Claude Code hook handlers into `~/.claude/hooks/`. Required for in-app hook event notifications. Hook handler files live outside this repo.

## Architecture

Three-process Electron app:

- `src/main/` — main process: PTY management, SQLite, IPC handlers, file watcher
- `src/preload/` — IPC bridge: exposes typed `window.deck` API
- `src/renderer/` — React UI: components, stores, hooks
- `src/shared/` — shared types and IPC channel constants (`src/shared/ipc.ts`)

**IPC pattern:** handlers split by domain (`ipc-handlers-{workspaces,sessions,dialog,settings,system,hooks,git}.ts`). Channel names live in `src/shared/ipc.ts` and are imported on both sides. Renderer calls `window.deck.*` (typed via preload).

**Hook event flow:** Claude Code hook → writes to `~/.deck/` → chokidar (`event-watcher.ts`) → match by `DECK_SESSION_ID` env (injected at PTY spawn) with cwd-broadcast fallback → `IPC.HOOK_EVENT_RECEIVED` to renderer.

## Database

SQLite via better-sqlite3, stored at `~/Library/Application Support/Deck/deck.db`. Schema in `src/main/db/`:

- `schema.sql` — initial schema (v1)
- `migrations.ts` — versioned migrations, currently `LATEST_VERSION = 5`
- `index.ts` — DB init, runs migrations on boot
- `seed.ts` — default workspace seeding (fresh install only)

**Sessions table fields:**

- Core: `id`, `workspace_id` (FK CASCADE), `name`, `cwd`, `command`, `sub_text`, `status`, `created_at`, `last_active_at`
- `kind` (v2): `'executor' | 'planner'`
- `type` (v3): `'claude-code' | 'shell'`
- `claude_session_id` (v4): for `--resume` reattachment
- `parent_session_id` (v5, FK CASCADE): planner→executor link

**Planner attachment rule (v5):** an `executor` session has `parent_session_id = NULL`. A `planner` session ALWAYS has `parent_session_id` set to an existing executor. Standalone planners were deleted in migration v5.

**Adding a migration:**

1. Append to `migrations` array in `migrations.ts`
2. Bump `LATEST_VERSION` (auto-derived from last entry)
3. Test: fresh install + upgrade from prior version (use `pnpm db:smoke`)

## Code conventions

- TypeScript end-to-end, strict mode, no `any` unless justified
- Functional style preferred (no classes for new code)
- Named exports only
- Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`
- Prettier-enforced: single quotes, no semicolons, `printWidth: 100`, `trailingComma: 'none'` (`.prettierrc.yaml`)
- Always run `pnpm typecheck && pnpm lint` before suggesting a commit

## Workflow

This project uses a deliberate **spec → plan → implement → validate → daily-drive** cycle:

1. Issue or `friction-log.md` (raiz) entry describes the dor
2. Investigation/inventory before code (decisions documented)
3. Implementation (no E2E validation as a separate step)
4. Manual E2E validation (Douglas runs scenarios)
5. Commit only after validation passes
6. Daily-drive in production before tagging a release

Friction discovered during daily-drive goes into `friction-log.md` (raiz) before becoming a GitHub issue.

Phase plans live in `docs/deck-phase*.md`. Friction tracking in `friction-log.md` (raiz).

## Constraints

- **macOS only**, x64 target (Apple Silicon runs via Rosetta)
- **Unsigned builds**: `.dmg` requires `xattr -cr /Applications/Deck.app` on first run
- `electron-updater` is wired but unsigned builds mean **OTA updates are effectively disabled**
- No `localStorage`/`sessionStorage`/`document` references in `src/main/` (renderer-only APIs)
- `xterm.js` lifecycle is fragile: unmount loses scrollback; mount/remount needs careful coordination with the PTY buffer
- Path separator: macOS-only, no Windows path handling

## Don't touch without asking

- `src/main/pty-manager.ts` — PTY spawn + lifecycle, fragile timing
- `src/main/pty-registry.ts` — PTY instance map, shutdown ordering
- `src/main/session-manager.ts` — core session logic, planner attachment rules
- `src/main/db/migrations.ts` — append-only; never edit existing migrations

## References

- Constitution / principles: `docs/deck-constitution.md`
- Planner super prompt + analysis: `docs/deck-planner-superprompt.md`
- Planner specs (F4 output): `docs/deck-specs/` (convention in `docs/deck-specs/README.md`)
- Phase 1 spec: `docs/deck-phase1-spec.md`
- Phase 2 tasks: `docs/deck-phase2-tasks.md`
- Phase 3 plan: `docs/deck-phase3-plan.md`
- Phase 3 validation: `docs/deck-phase3-validation.md`
- Visual drift notes: `docs/deck-visual-drift.md`
- Friction log: `friction-log.md` (raiz)
- Public README: `README.md`
