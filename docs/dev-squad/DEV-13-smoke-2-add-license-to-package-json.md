# DEV-13: SMOKE-2: Add LICENSE constant to package.json

> Issue: ca17aef2-bd73-44ee-accc-5f7d57c7f974
> Mode: validate

## Summary

Ensure `package.json` has a top-level `"license": "MIT"` field. This smoke test validates that the Dev Squad pipeline can produce and merge a PR after the recent repo reset.

## User Stories

- **US-1** As a pipeline operator, I want `package.json` to declare `"license": "MIT"`, so that the Dev Squad PR creation flow is confirmed working end-to-end.
  - Acceptance: `node -e "console.log(require('./package.json').license)"` outputs `MIT`.

## Functional Requirements

- **FR-001** System MUST ensure a top-level `"license": "MIT"` field exists in `package.json`.
- **FR-002** If `"license"` already exists with value `"MIT"`, the Developer MUST leave it unchanged and close the issue as completed (no-op commit is acceptable to exercise the PR pipeline).
- **FR-003** If `"license"` exists with a value other than `"MIT"`, Developer MUST NOT overwrite it — post `DEV_BLOCKED` and halt.

## Non-Functional / Constraints

- **Stack constraints**: TypeScript strict, named exports, no `any` (CLAUDE.md)
- **Locked files** (CLAUDE.md): `src/main/pty-manager.ts`, `src/main/pty-registry.ts`, `src/main/session-manager.ts`, `src/main/db/migrations.ts`
- **Dependencies**: no new packages required

## Out of Scope

- Adding a `LICENSE` file at repo root (separate concern)
- Updating any other field in `package.json`
- Lockfile changes (license field does not affect dependencies)

## Files Affected

### Modify
- `package.json` — add or confirm `"license": "MIT"` field

## Test Plan

### Automated (Developer + QA run literally)
- `pnpm typecheck` → exit 0
- `node -e "console.log(require('./package.json').license)"` → outputs `MIT`
- `git diff --stat package.json` → shows 0 or 1 line changed (0 if already present)

### Manual (QA executes step-by-step)
1. Open `package.json` → verify `"license": "MIT"` is present at the top level.
2. Run `pnpm typecheck` → confirm exit 0, no new errors.
3. Confirm PR was created and merged successfully (smoke test passes).

## Open Questions

- **Q1** `"license": "MIT"` is already present in the committed `package.json` (confirmed by reading the repo). The effective diff may be zero lines. Recommendation: Developer creates a no-op commit (e.g., a whitespace normalisation or adds a newline) to exercise the PR pipeline, or simply opens a PR with no file changes and marks the issue complete — whichever satisfies the smoke-test goal.
