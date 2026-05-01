# Add CHANGELOG.md skeleton at repo root — spec

> Issue: DEV-7

## Goal

Create a standard-format CHANGELOG.md file at the repository root to establish a changelog convention for tracking notable changes in the Deck project. This provides a foundation for documenting releases and user-facing changes following the Keep a Changelog format.

## Non-goals

- Populating historical changes or entries
- Setting up automated changelog generation tooling
- Creating release workflow automation

## Constraints

- Locked files (from CLAUDE.md): None for this change
- Convention rules: Follow Keep a Changelog format (https://keepachangelog.com)
- Must be minimal: only heading, intro paragraph, and Unreleased section
- No other sections or entries

## Architecture

Single markdown file at repo root. No code changes, no dependencies, no build process impact.

## Files

### Create

- `CHANGELOG.md` — Standard changelog file with Keep a Changelog format header and Unreleased section

### Modify

None

### Delete

None

## Tasks

- [x] **T1** — Create `CHANGELOG.md` at repo root with:
  - `# Changelog` h1 heading
  - Intro paragraph referencing Keep a Changelog format
  - `## [Unreleased]` section (empty)
- [x] **T2** — Verify file follows Keep a Changelog structure
- [x] **T3** — Commit with conventional commit message

## Test plan

### Manual

1. Verify `CHANGELOG.md` exists at repo root
2. Verify heading structure matches Keep a Changelog format
3. Verify Unreleased section is present and empty

### Automated

- typecheck passes (no code changes, should not affect)
- lint passes (markdown file, not linted)
- existing smoke tests don't regress (no code changes)

## Rollback

Simple file deletion: `git rm CHANGELOG.md`. No state, configuration, or dependencies affected.

## Open questions

None — requirements are explicit and minimal.
