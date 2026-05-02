# DEV-16: Multi-type session Phase 2 — Gemini CLI

> Issue: DEV-16
> Mode: refine

## Summary

Add `'gemini'` as a first-class session type that wraps the Gemini CLI, following the same pattern as `'claude-code'`. Includes a dedicated badge (`cyan` variant), a type button in the New Session dialog, a palette action, and correct PTY spawn behaviour.

## User Stories

- **US-1** As a developer, I want to create a Gemini CLI session from the New Session dialog, so that I can interact with Gemini in a managed PTY alongside my other sessions.
  - Acceptance: The dialog shows a "Gemini" type button with a distinct icon; selecting it spawns a session with `type === 'gemini'` and the default command `gemini`.
- **US-2** As a developer, I want the session header to show a distinct `gemini` badge, so that I can distinguish Gemini sessions from Claude Code and shell sessions at a glance.
  - Acceptance: Sessions with `type === 'gemini'` display a `ConfigBadge` with label `'gemini'` and variant `'cyan'`.
- **US-3** As a developer, I want a "New Gemini session" command in the command palette, so that I can open a Gemini session without touching the mouse.
  - Acceptance: The palette shows a `'New Gemini session'` action that opens the dialog pre-selected on the `'gemini'` type.
- **US-4** As a developer, I want a graceful error when the `gemini` CLI is not installed, so that the app does not silently fail.
  - Acceptance: If the PTY exits immediately (exit code non-zero, within ~2 s of spawn), the session transitions to `'idle'` and the existing unexpected-exit handling fires — no new code required beyond correct spawn path.

## Functional Requirements

- **FR-001** `SessionType` in `src/shared/ipc.ts` MUST include `'gemini'` as a union member.
- **FR-002** `session-manager.ts` `create()` MUST accept `type === 'gemini'` and store `'gemini'` in the DB `type` column.
- **FR-003** `session-manager.ts` `rowToSession()` MUST map DB value `'gemini'` to `SessionType` `'gemini'` (not fall through to `'claude-code'`).
- **FR-004** `session-manager.ts` `attach()` MUST spawn a `'gemini'` session identically to `'claude-code'`: shell args `['-ilc', direnvPrefix + command]`, with `DECK_SESSION_ID` injected.
- **FR-005** `SessionHeader.tsx` `getConfigLabel()` MUST return `{ label: 'gemini', variant: 'cyan' }` for `type === 'gemini'`.
- **FR-006** `SessionDialog.tsx` type-selector array MUST include `{ t: 'gemini', label: 'Gemini', icon: <Sparkles /> }` rendered as a sibling button alongside Claude Code, Shell, SSH.
- **FR-007** `SessionDialog.tsx` `getLastType()` MUST recognise `'gemini'` as a valid stored value (add `|| stored === 'gemini'` guard).
- **FR-008** `SessionDialog.tsx` `autoName()` MUST return `${workspace.name}/gemini` for `type === 'gemini'`.
- **FR-009** `SessionDialog.tsx` MUST show the Command field for `type === 'gemini'` (same condition as `'claude-code'`), with placeholder `gemini`.
- **FR-010** `SessionDialog.tsx` `handleSubmit()` MUST pass `command: command.trim()` (not empty string) when `type === 'gemini'`.
- **FR-011** `usePaletteActions.ts` MUST include a `'new-gemini-session'` action (`label: 'New Gemini session'`, category `'sessions'`) that calls `openNewSessionDialog(wsId, 'gemini')`.

## Non-Functional / Constraints

- **Locked files** (from CLAUDE.md — Reviewer enforces): `src/main/pty-manager.ts`, `src/main/pty-registry.ts`, `src/main/db/migrations.ts`
- **Stack constraints**: TypeScript strict, no `any`, named exports, React functional components, no `localStorage`/`document` in `src/main/`
- **No DB migration needed**: the `type` column is `TEXT` with no enum constraint; adding a new string value requires no schema change. `LATEST_VERSION` stays at `6`.
- **Mergeable with DEV-15**: both branches add one union member to `SessionType` and one entry to the SessionDialog type-selector array. Changes are additive and non-overlapping on enum members (`'codex'` vs `'gemini'`).

## Out of Scope

- Gemini-specific settings (API key, model selection) — not in this phase.
- Hook event integration for Gemini sessions (no `DECK_SESSION_ID` contract with Gemini CLI).
- Planner/executor attachment for Gemini sessions.
- Windows/Linux support.

## Files Affected

### Modify
- `src/shared/ipc.ts` — add `'gemini'` to `SessionType` union; add `'gemini'` guard in `getLastType` within SessionDialog import chain
- `src/main/session-manager.ts` — add `'gemini'` branch in `rowToSession()` and `create()` type narrowing
- `src/renderer/src/components/session/SessionHeader.tsx` — add `'gemini'` case in `getConfigLabel()`
- `src/renderer/src/components/sidebar/SessionDialog.tsx` — add Gemini type button, `getLastType` guard, `autoName` case, Command field visibility, `handleSubmit` passthrough
- `src/renderer/src/hooks/usePaletteActions.ts` — add `'new-gemini-session'` palette action

## Test Plan

### Automated (Developer + QA run literally)
- `pnpm typecheck` → exit 0
- `pnpm lint` → exit 0, no new warnings
- `pnpm test --run` → all pass
- `pnpm session:smoke` → exit 0

### Manual (QA executes step-by-step)
1. Open the app, press ⌘N (or click New Session) → the dialog shows four type buttons: Claude Code, Shell, SSH, **Gemini**. The Gemini button has a `Sparkles` icon.
2. Select Gemini → Name auto-populates as `<workspace>/gemini`; a Command field appears pre-filled with `gemini`; Working Directory field is visible.
3. Submit the form → a new session is created; the session header shows a **cyan** `gemini` badge.
4. Open the command palette → typing "gemini" surfaces the "New Gemini session" action; activating it opens the dialog pre-selected on the Gemini type.
5. With `gemini` CLI installed: attach the session → PTY spawns, prompt appears.
6. With `gemini` CLI absent: attach the session → PTY exits immediately; session transitions to idle; no crash.
7. Reopen the app after having last selected Gemini type → dialog reopens with Gemini pre-selected (localStorage persistence).

## Open Questions

- **Q1** DEV-15 (Codex) is running in parallel and will add `'codex'` to the same `SessionType` union and SessionDialog array. Recommendation: both branches land as additive changes; whichever merges second resolves a trivial union-member conflict. No architectural action needed.
