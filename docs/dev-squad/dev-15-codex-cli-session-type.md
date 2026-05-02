# DEV-15: Codex CLI Session Type

> Issue: DEV-15
> Mode: refine

## Summary

Add `'codex'` as a first-class `SessionType` in Deck so that users can create Codex CLI sessions
with the same creation flow and affordances as `claude-code` sessions. The session header badge
renders "codex" in cyan, the configurable CLI path defaults to `codex`, and a missing binary
surfaces naturally through the PTY terminal output rather than hanging silently.

## User Stories

- **US-1** As a developer, I want to create a Codex CLI session in Deck, so that I can run the
  Codex CLI alongside Claude Code sessions without switching apps.
  - Acceptance: The session creation dialog (SessionDialog / GlobalSessionDialog) lists "codex"
    as a selectable type. Choosing it creates a session with `type = 'codex'` and the configured
    codex command running in the PTY.
- **US-2** As a developer, I want the session header to show a distinct "codex" badge, so that
  I can tell session types apart at a glance.
  - Acceptance: `SessionHeader.getConfigLabel()` returns `{ label: 'codex', variant: 'cyan' }`
    for `session.type === 'codex'`; the badge renders in cyan (variant already supported by
    `ConfigBadge`).
- **US-3** As a developer, I want to configure the codex CLI path in Settings, so that I can
  point Deck at a non-default installation.
  - Acceptance: `SettingsDialog` exposes a "Codex path" text field bound to
    `DeckSettings.codexPath`. Leaving it blank defaults to `'codex'`. Value is persisted and
    used as the default command when creating a codex session without an explicit command.
- **US-4** As a developer, if the codex binary is absent, I want a visible error in the terminal
  rather than a silent hang, so that I know what went wrong.
  - Acceptance: Running a codex session with an invalid binary path shows the shell's
    "command not found" output in the PTY terminal and the session remains idle. No special
    UI crash or hang occurs. (Existing PTY behavior already provides this.)

## Functional Requirements

- **FR-001** The `SessionType` union in `src/shared/ipc.ts` MUST include the literal `'codex'`.
- **FR-002** `SessionManager.create()` MUST recognize `req.type === 'codex'` and persist
  `type = 'codex'` in the sessions table — parallel to how `'shell'` and `'ssh'` are handled.
- **FR-003** `SessionManager.rowToSession()` MUST map `row.type === 'codex'` to `'codex'`
  before the existing `'claude-code'` fallback so restored sessions keep their type.
- **FR-004** When `type === 'codex'` and `req.command` is not provided, `SessionManager.create()`
  MUST use `settings.codexPath ?? 'codex'` as the session command.
- **FR-005** `DeckSettings` MUST include `codexPath?: string` (optional; default resolved at
  runtime to `'codex'` when absent or empty).
- **FR-006** `SettingsDialog` MUST expose a "Codex path" text input bound to
  `DeckSettings.codexPath`; saving persists the value via `DeckSettingsApi.set()`.
- **FR-007** `SessionHeader.getConfigLabel()` MUST return `{ label: 'codex', variant: 'cyan' }`
  for `session.type === 'codex'`.
- **FR-008** The session creation UI (`SessionDialog.tsx`, `GlobalSessionDialog.tsx`) MUST list
  `'codex'` as a selectable type alongside `'claude-code'`, `'shell'`, and `'ssh'`.
- **FR-009** Codex sessions MUST only support `kind = 'executor'`. The creation form MUST hide
  or disable the planner option when `'codex'` is selected (codex has no planner mode).

## Non-Functional / Constraints

- **Locked files** (from CLAUDE.md — developer must review these changes carefully):
  `src/main/session-manager.ts` (core session logic, planner attachment rules),
  `src/main/db/migrations.ts` (append-only, never edit existing entries)
- **Stack constraints**: TypeScript 5.9 strict, no `any`, named exports only, single quotes,
  no semicolons, `printWidth: 100`, `trailingComma: 'none'`
- **ESLint**: never scatter `// eslint-disable-next-line` — refactor or change rule globally
- **DB**: `type` column is plain TEXT with no CHECK constraint (confirmed in `schema.sql`),
  so no migration is needed to store `'codex'`. Migrations are append-only; do not edit v1–v5.
- **xterm.js**: do not remount the terminal during type selection in the creation dialog
- **macOS only**: no Windows path separator handling needed

## Out of Scope

- Codex planner sessions (no planner concept in the Codex CLI).
- Codex session resume / `--session-id` equivalent (not defined for Phase 2).
- SSH tunnelling for codex sessions.
- Codex-specific tool allow/disallow lists.
- Windows or Linux binary path handling.
- Auto-detection of the codex binary location at startup.

## Files Affected

### Modify
- `src/shared/ipc.ts` — add `'codex'` to `SessionType` union (line 5); add `codexPath?: string`
  to `DeckSettings` interface (around line 270)
- `src/main/session-manager.ts` — update `rowToSession()` type coercion to handle `'codex'`;
  update `create()` type coercion and command defaulting to use `settings.codexPath ?? 'codex'`
  when `type === 'codex'` and no explicit command is supplied
- `src/renderer/src/components/session/SessionHeader.tsx` — add `codex` branch in
  `getConfigLabel()` returning `{ label: 'codex', variant: 'cyan' }`
- `src/renderer/src/components/settings/SettingsDialog.tsx` — add "Codex path" text input
  bound to `DeckSettings.codexPath`
- `src/renderer/src/components/sidebar/SessionDialog.tsx` — add `'codex'` as a type option;
  hide planner kind selector when codex is selected
- `src/renderer/src/components/GlobalSessionDialog.tsx` — same type option and planner-hiding
  as `SessionDialog.tsx`

### Create
_(none)_

### Delete
_(none)_

## Test Plan

### Automated (Developer + QA run literally)
- `pnpm typecheck` → exit 0
- `pnpm lint` → exit 0, no new warnings
- `pnpm test --run` → all pass
- `pnpm db:smoke` → migrations pass (no new migration added, but verify existing pass)
- `pnpm session:smoke` → session manager tests pass

### Manual (QA executes step-by-step)
1. Open Deck → click "New Session" → verify the type selector lists "Codex" alongside
   Claude Code, Shell, SSH → expected: all four options visible.
2. Select type "Codex" → verify the planner kind option is hidden/disabled →
   expected: only "Executor" kind available.
3. Create a Codex session with default settings → expected: session created, terminal opens,
   badge in `SessionHeader` is cyan and labelled "codex".
4. Open Settings → verify a "Codex path" field exists → enter `/usr/local/bin/codex` →
   save → create a new Codex session with no explicit command → expected: PTY runs the
   command at the configured path.
5. Set "Codex path" to `/nonexistent/codex` → create a Codex session → expected: terminal
   shows `zsh: command not found: /nonexistent/codex` (or equivalent); session stays idle,
   no app crash or hang.
6. Restart Deck after creating a codex session → reopen the session → expected: badge still
   shows cyan "codex", type is preserved from SQLite.

## Open Questions

- **Q1** `SessionDialog.tsx` and `GlobalSessionDialog.tsx` may share a type-picker component
  or duplicate logic — confirm before implementing so the codex option is added once.
  Recommendation: grep for the type selector UI and extract a shared component if needed.
- **Q2** Does the creation form currently pre-fill `command` from `settings.defaultExecutorCommand`
  for `claude-code` sessions? If yes, follow the same pattern for codex using `codexPath`.
  Recommendation: read `SessionDialog.tsx` top-to-bottom before writing the codex command
  defaulting logic.
