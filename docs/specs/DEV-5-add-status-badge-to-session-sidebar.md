# Add status badge to session sidebar items — spec

> Issue: DEV-5

## Goal
Make every session row in the left sidebar carry a small colored status dot whose color reflects the session's current operational state, so the user can scan the sidebar and immediately see which sessions are working, idle, awaiting attention, or have errored — without having to open each one.

## Non-goals
- Do **not** introduce new `SessionStatus` enum values such as `'failed'` or `'detached'`. The current type is `type SessionStatus = 'idle' | 'working'` (`src/shared/ipc.ts:1`-ish near `SessionStatus`) and broadening it touches the DB schema (a v6 migration), `session-manager.ts` lifecycle code, the renderer store, and IPC contracts. That is out of scope for a sidebar visual change.
- Do **not** add new SQLite columns or migrations.
- Do **not** rewire how status transitions are produced in `src/main/session-manager.ts` (lines 143, 361, 411, 457, 468, 487 already drive the existing two-state machine).
- Do **not** touch the right-hand sidebar (`components/sidebar-right/`) or the terminal pane.
- Do **not** introduce new icons (Lucide or otherwise) for the badge — a colored dot is the agreed visual.
- Do **not** add tooltips, popovers, or click handlers on the dot in this iteration.

## Constraints
- Locked files (from `CLAUDE.md` → "Don't touch without asking"): the section is empty in `CLAUDE.md`, so no files are explicitly locked. Still, **do not** edit `src/main/db/schema.sql`, `src/main/db/migrations.ts`, or `src/shared/ipc.ts` as part of this spec — they are out of scope per the non-goals above.
- Code conventions (from `CLAUDE.md` → "Code conventions"):
  - TypeScript strict, no `any`.
  - Functional style, named exports only.
  - Prettier: single quotes, no semicolons, `printWidth: 100`, `trailingComma: 'none'`.
  - Conventional commits (`feat:`, `fix:`, etc.).
  - Run `pnpm typecheck && pnpm lint` before committing.
- Stack constraints: Electron 39 / React 19 / Tailwind v4. Use the existing `StatusDot` primitive (`src/renderer/src/components/ui/StatusDot.tsx`) — do not re-implement.
- The `StatusDot` component already exposes:
  - variants: `'working' | 'awaiting' | 'idle' | 'pending' | 'error'`
  - sizes: `sm` (6px = `w-1.5 h-1.5`) and `md` (8px = `w-2 h-2`)
  - color tokens: `bg-success`, `bg-amber`, `bg-op-zinc-600`, `bg-danger`
- Issue text says "6px dot, aligned to the right of the name." The existing implementation in `SessionItem.tsx` uses `size="md"` (8px) and places the dot to the **left** of the name in a `grid grid-cols-[8px_1fr_auto]`. Both diverge from the issue spec — see Open questions Q1/Q2.

## Architecture

### Current state (already in repo)
`src/renderer/src/components/sidebar/SessionItem.tsx:31`-`42` already renders a dot:

```
notificationState (per-session, from deck store)  ─┐
                                                   ├──▶ dotVariant ──▶ <StatusDot variant size="md" />
session.status  ('idle' | 'working', from main)   ─┘
isActive (active row suppresses notification)     ─┘
```

Resolution order (already implemented):
1. `!isActive && notificationState === 'error'` → `'error'` (red, pulsing)
2. `!isActive && notificationState === 'pending'` → `'pending'` (amber, pulsing)
3. `session.status === 'working'` → `'working'` (green)
4. otherwise → `'idle'` (gray)

The dot lives in the first column of the row's grid (`grid grid-cols-[8px_1fr_auto]`), left of the name.

### Target state for this issue
Keep the existing resolution logic and primitive. Make two visual adjustments to align with the issue text:

1. **Size**: switch from `size="md"` (8px) to `size="sm"` (6px) — matches "6px dot".
2. **Position**: move the dot from the leading column to a trailing position so it sits to the **right** of the name (and to the **left** of the relative-time label). Grid changes from `grid-cols-[8px_1fr_auto]` to `grid-cols-[1fr_auto_auto]` with the dot in column 2 and `formatRelativeTime(...)` in column 3. The leading 22-px left padding (`pl-[22px]`) stays so vertical alignment with the workspace header is preserved.

No new state, no new IPC, no new store fields. Issue's `'failed'` request is satisfied by the existing `notificationState === 'error'` path; `'detached'` has no in-system referent (detached sessions are not surfaced as rows the way the issue implies — see Q3).

```
Sidebar.tsx
  └─ SessionItem.tsx               ◀── only file modified
        ├─ resolves dotVariant     (unchanged logic)
        └─ <StatusDot variant size="sm" />  (was size="md", was leading column)
```

## Files

### Modify
- `src/renderer/src/components/sidebar/SessionItem.tsx` — change `<StatusDot ... size="md" />` to `size="sm"`; restructure the row's grid so the dot renders to the right of the `min-w-0` name/subtext block and to the left of the `formatRelativeTime` cell. Update the inline `mt-[5px]` wrapper's vertical offset so the smaller dot remains optically centered with the first line of the name (target: `mt-[7px]` to match the time label, fine-tune in the manual test pass).

### Create
- _(none)_

### Delete
- _(none)_

## Tasks
Ordered, each independently testable.

- [ ] **T1** — In `SessionItem.tsx`, change the existing `<StatusDot variant={dotVariant} size="md" />` to `size="sm"`. Verify dev build still renders without layout regression.
- [ ] **T2** — Restructure the row container's Tailwind grid from `grid-cols-[8px_1fr_auto]` to `grid-cols-[1fr_auto_auto]`. Move the `<StatusDot>` wrapper out of the leading column and into a new wrapper that lives between the `min-w-0` name block and the relative-time block. Adjust the wrapper's `mt-[…]` so the dot is vertically aligned with the first text baseline of the name.
- [ ] **T3** — Sweep the file for now-dead bits introduced by T2 (e.g. the leading 8-px column gap, any `flex-shrink-0` wrappers that no longer apply). Keep `pl-[22px]` on the row so left alignment with the workspace header is preserved.
- [ ] **T4** — Run `pnpm typecheck && pnpm lint`. Fix any complaints.
- [ ] **T5** — Run `pnpm db:smoke` if it exists for this repo (per `CLAUDE.md` → "Smoke tests") to confirm no unrelated regression. If the smoke target does not include renderer code, skip and note in the PR.
- [ ] **T6** — Manual visual pass per the Test plan below.

## Test plan

### Manual
1. **Idle session**: launch `pnpm dev`, create a fresh session, leave it untouched. Expect: gray 6-px dot to the right of the name.
2. **Working session**: type a command that keeps the PTY busy (e.g. `sleep 5`). While running, the dot turns green. Returns to gray when the prompt comes back.
3. **Error notification**: trigger a hook event with state `error` for a non-active session (or set it from devtools via the Zustand store: `useDeckStore.getState().setNotificationState(id, 'error')`). The non-active row's dot turns red and pulses. Selecting the row clears it (existing behavior).
4. **Pending notification**: same drill with `setNotificationState(id, 'pending')`. Amber pulsing dot on non-active rows.
5. **Active row suppression**: confirm that selecting a row that previously had `error`/`pending` falls back to the underlying `session.status`-driven color.
6. **Long names**: create a session with a very long name. Confirm the name truncates (`truncate` class) and the dot + relative-time cell remain visible on the right edge.
7. **Both session types**: verify `'shell'` and `'ssh'` rows (which carry leading `Terminal` / `Server` Lucide icons in the name block) still render correctly with the dot now on the right.

### Automated
- `pnpm typecheck` passes (no `any`, strict mode).
- `pnpm lint` passes (Prettier-clean, ESLint-clean per `CLAUDE.md` → "ESLint policy").
- No existing test asserts on the SessionItem layout (per `find … -name '*.test.tsx'` the only test files are inside `node_modules`), so no snapshot updates are required. If the executor finds a project-level test file added since this spec was written, update it.

## Rollback
Single-file change. To undo:

```bash
git -C /Users/macmini/server/apps/deck checkout main -- src/renderer/src/components/sidebar/SessionItem.tsx
```

No DB migration, no IPC contract change, no store change → no state cleanup needed.

## Open questions
- **Q1** — Issue says "yellow for idle". Current `'idle'` variant is gray (`bg-op-zinc-600`) and `'awaiting'`/`'pending'` is amber. Recommendation: **keep idle gray**. Yellow on every dormant row would be visually noisy and conflicts with the established convention that amber means "needs attention". If the user truly wants yellow-for-idle, that is a separate design call that should also touch the statusbar dot.
- **Q2** — Issue says "aligned to the right of the name". The trailing column today is `formatRelativeTime(session.lastActiveAt)`. Recommendation: place the dot **between** the name block and the time label (`grid-cols-[1fr_auto_auto]`), not as the rightmost element. Putting it after the timestamp pushes it off the visible edge for long names. If the user wants it as the rightmost element, swap the order in T2.
- **Q3** — Issue mentions `'failed'` and `'detached'` statuses. Neither exists in `SessionStatus` (`'idle' | 'working'` only). Recommendation: map `'failed'` to the existing `notificationState === 'error'` red dot (already implemented). Drop `'detached'` from scope — there is no detached-but-still-listed concept in `session-manager.ts`; closing/detaching removes the row. If the user wants a true four-state machine, file a follow-up issue covering: `SessionStatus` widening, a v6 migration, lifecycle transitions in `session-manager.ts`, and an IPC contract bump.
- **Q4** — Issue says "Use Lucide icons if needed but a colored dot is fine." Recommendation: stick with the dot. Adding an icon doubles the visual weight and the row already carries leading `Terminal`/`Server` Lucide marks for shell/ssh sessions.
