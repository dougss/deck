# DEV-17: Add Finder option to Open In split button

> Issue: DEV-17
> Mode: validate

## Summary

Add "Finder" as a visible, always-present option in the `OpenInSplitButton` dropdown. Selecting it opens the macOS Finder at the session's `cwd` using `/usr/bin/open`. The primary button remembers Finder as `lastEditor` and re-opens it directly on subsequent clicks.

## User Stories

- **US-1** As a developer, I want to open the session's working directory in Finder, so that I can browse files visually without leaving Deck.
  - Acceptance: Dropdown shows "Finder" in the main group (after Fork); clicking it opens a Finder window at `session.cwd`.
- **US-2** As a developer, I want the primary button to remember "Finder" as my last editor, so that I can reopen Finder in one click.
  - Acceptance: After selecting Finder from the dropdown, the primary button label shows "Finder" with a folder icon and clicking it opens Finder directly.

## Functional Requirements

- **FR-001** System MUST add `'finder'` to the `EditorPreset` union type in `src/shared/ipc.ts` (result: `'zed' | 'cursor' | 'vscode' | 'fork' | 'finder' | 'custom'`).
- **FR-002** `getEditorLabel('finder')` MUST return `'Finder'` in `OpenInSplitButton.tsx`.
- **FR-003** `getEditorIcon('finder')` MUST return `<Folder size={14} strokeWidth={1.75} />` from `lucide-react`.
- **FR-004** A "Finder" `DropdownMenuItem` MUST be rendered in the main group after the Fork item (no separator, always visible — not conditional).
- **FR-005** Selecting "Finder" from the dropdown MUST call `window.deck.system.openInEditor({ workspacePath: session.cwd, editor: 'finder' })` and persist `'finder'` as `lastEditor`.
- **FR-006** The `IPC.SYSTEM_OPEN_IN_EDITOR` handler in `src/main/ipc-handlers-system.ts` MUST handle `req.editor === 'finder'` by setting `command = '/usr/bin/open "' + escapedPath + '"'` — inserted as an `else if` before the final `else` branch, reusing the existing `spawn('/bin/zsh', ['-ilc', command], ...)` pattern.
- **FR-007** `'finder'` MUST NOT be added to `PRESET_BINS` (it uses `/usr/bin/open`, not an editor CLI binary).

## Non-Functional / Constraints

- **Locked files** (do not touch): `pty-manager.ts`, `pty-registry.ts`, `session-manager.ts`, `db/migrations.ts`
- **Stack constraints**: TypeScript strict, no `any`, named exports only, single quotes, no semicolons, `printWidth: 100`, `trailingComma: 'none'`
- **No new dependencies**: `Folder` is already available in `lucide-react` (already imported in other components)
- **macOS only**: project constraint already in place; no cross-platform handling needed

## Out of Scope

- Opening a specific file in Finder (only `cwd` is opened)
- Custom Finder path (uses system Finder only)
- Finder positioning in dropdown beyond "after Fork in main group"
- Windows/Linux path handling

## Files Affected

### Modify
- `src/shared/ipc.ts` — add `'finder'` to `EditorPreset` union type
- `src/renderer/src/components/session/OpenInSplitButton.tsx` — add `Folder` import, `'finder'` cases in `getEditorLabel`/`getEditorIcon`, and Finder `DropdownMenuItem` after Fork
- `src/main/ipc-handlers-system.ts` — add `else if (req.editor === 'finder')` case before the final `else` branch

## Test Plan

### Automated (Developer + QA run literally)
- `pnpm typecheck` → exit 0
- `pnpm lint` → exit 0, no new warnings

### Manual (QA executes step-by-step)
1. Open any session with a valid `cwd` → click the chevron dropdown → "Finder" appears in the main group after "Fork" (no separator before it)
2. Click "Finder" in the dropdown → macOS Finder window opens at `session.cwd`
3. Re-open the dropdown → primary button now shows "Finder" label and folder icon
4. Click the primary button directly → Finder opens at `session.cwd` without using the dropdown

## Open Questions

_(none)_
