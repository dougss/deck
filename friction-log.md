# Deck — Friction Log

Raw observations during real use. Input for future task prioritization.

## Format

- **YYYY-MM-DD HH:MM** — one-line context
  - What I was doing
  - What I needed
  - What friction occurred
  - Imagined ideal UX (optional)
  - Severity: minor / medium / blocker

## Entries

### Phase 2 → Phase 3 transition

- **2026-04-21 20:30** — Paste bug
  - Context: tentando colar prompt no CC
  - Needed: ⌘V no xterm
  - Friction: não funcionava
  - Severity: blocker
  - Status: ✅ fixed in v0.2.1

### Phase 3 Infra

- **2026-04-21 22:00** — cc vs claude
  - Context: quero --dangerously-skip-permissions por default
  - Needed: config global sem editar cada session
  - Friction: hardcoded
  - Severity: medium
  - Status: ✅ fixed in T1

- **2026-04-21 22:15** — Open in IDE from build
  - Context: click right-click em workspace no Deck.app instalado
  - Needed: abrir Zed/Cursor
  - Friction: silent fail
  - Severity: medium
  - Status: ✅ fixed in T1-amend

### Daily driving (ongoing)

- **2026-04-22 06:26** — Shift+Enter no input do Claude Code
  - Context: digitando prompt multi-linha no executor session
  - Needed: nova linha sem submeter
  - Friction: Shift+Enter submete em vez de inserir \n
  - Severity: medium

- **2026-04-22 08:05** — Terminal por session para dev server
  - Context: quero rodar `pnpm dev` em paralelo com o CC
  - Needed: shell próprio por session (não global)
  - Friction: terminal utility é global/único — não isola por sessão
  - Severity: medium

- **2026-04-22 08:07** — Paste duplicando no xterm
  - Context: colando prompt no executor e utility terminal
  - Needed: ⌘V cola 1x
  - Friction: colava 2x — double handler (Edit menu role + attachCustomKeyEventHandler)
  - Severity: blocker
  - Status: ✅ fixed in v0.3.0-beta.2 (T2 amend)
