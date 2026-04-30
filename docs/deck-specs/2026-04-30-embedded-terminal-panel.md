# Embedded Terminal Panel — spec

> Issue: [#24](https://github.com/dougss/deck/issues/24) · Approach 1 (UtilityTerminal externalizado)

## Goal

Permitir um terminal local embedded (`zsh -il` em `session.cwd`) toggleável dentro de qualquer session attached, com split horizontal + foco estilo VS Code.

## Non-goals

- Persistência cross-restart do PTY embedded (modelo B confirmado: morre no detach).
- Múltiplos embedded terminals por session (1 só por session no MVP).
- Tabs ou named terminals dentro do embedded panel.
- Rodar o embedded em SSH session no host remoto (sempre local).
- Hook events oriundos do embedded (eles vão chegar via `DECK_SESSION_ID` mas não há pipeline novo).

## Constraints

- **Locked files** (CLAUDE.md): NÃO editar `pty-manager.ts`, `pty-registry.ts`, `session-manager.ts`, `db/migrations.ts`. Spec respeita: nada toca esses arquivos.
- macOS only.
- TS strict, no `any`, named exports, single quotes, no semis, printWidth 100.
- Princípio #1 (terminal core): embedded precisa funcionar como o principal — cores, resize, ctrl+c, paste, paths clicáveis (WebLinks).
- Sem novos packages.

## Architecture

### Componentes

```
TerminalHost
├── (per attached session)
│   └── SessionSplit                              ← novo
│       ├── SessionTerminal (top, principal)      ← já existe, sem mudança estrutural
│       └── (if embedded toggle ON)
│           ├── ResizableSplitHandle (vertical)   ← novo
│           └── EmbeddedTerminal (bottom)         ← novo
```

### Estado UI (Zustand)

Novos campos em `useDeckStore`:

- `embeddedToggleMap: Record<SessionId, boolean>` — fonte da verdade em runtime; espelha localStorage `deck:embeddedTerminal:<sessionId>`.
- `embeddedFocusMap: Record<SessionId, 'main' | 'embedded'>` — qual lado tem foco quando split visível. Não persiste (default `'embedded'` ao abrir).
- Actions:
  - `toggleEmbeddedTerminal(sessionId)` — state machine 3 estados (oculto → visível+foco-embedded / foco-main → foco-embedded / foco-embedded → oculto).
  - `setEmbeddedFocus(sessionId, side)` — chamado on click.

Ratio global: `localStorage['deck:embeddedTerminalRatio']` (number 0.1–0.6, default 0.3 = 30% bottom). Lido/gravado direto via helpers (não no store, igual `deck:rightPanelWidth` em AppBody).

### IPC

Estender `PtySpawnRequest` em `src/shared/ipc.ts`:

```ts
export interface PtySpawnRequest {
  cwd: string
  cols: number
  rows: number
  shell?: string
  args?: string[]
  command?: string
  sessionId?: SessionId // ← novo. Quando presente, main injeta DECK_SESSION_ID
}
```

Em `src/main/ipc-handlers.ts` (handler de `IPC.PTY_SPAWN`): se `req.sessionId`, passa `env: { DECK_SESSION_ID: req.sessionId }` pro `PtyManager.spawn`. Backwards-compat: ausência de `sessionId` mantém comportamento atual (UtilityTerminal segue funcionando).

### Atalhos

`src/main/menu.ts` — adicionar **2 entries** no menu View, ambos disparando o mesmo IPC:

- "Toggle Embedded Terminal" — `Ctrl+\`` — primário.
- "Toggle Embedded Terminal (alt)" — `CmdOrCtrl+J` — fallback.

Novo channel `IPC.SHORTCUT_TOGGLE_EMBEDDED` em `src/shared/ipc.ts` + entry em `DeckShortcutsApi` (`onToggleEmbedded`).

`useDeckShortcuts.ts` listener: chama `toggleEmbeddedTerminal(activeSessionId)` se há session ativa attached.

### State machine do toggle (Ctrl+`)

```
                              Ctrl+`
oculto                  ──────────────────►   visível + foco='embedded'
                              Ctrl+`
visível, foco='main'    ──────────────────►   visível + foco='embedded'
                              Ctrl+`
visível, foco='embedded' ─────────────────►   oculto
```

Foco aplicado via:

- `EmbeddedTerminal` recebe prop `focused: boolean`. Em `useLayoutEffect`, se `focused && visible`, chama `term.focus()`.
- `SessionTerminal` ganha mesma prop (hoje sempre foca quando `visible`). Default sem mudança quando embedded está OFF.
- Click handler em cada container: `onMouseDown` → `setEmbeddedFocus(sessionId, side)`.

### Lifecycle do PTY embedded

- **Mount** (toggle ON): `EmbeddedTerminal` chama `window.deck.pty.spawn({ cwd: session.cwd, sessionId: session.id, shell: '/bin/zsh', args: ['-il'], cols, rows })`.
- **Unmount** (toggle OFF, session detach, app close): kill via `window.deck.pty.kill(ptyId)`.
- **Re-attach automático**: TerminalHost lê `localStorage[deck:embeddedTerminal:<id>]` quando uma session aparece em `attached` (ptyId !== null). Se `'true'`, hidrata `embeddedToggleMap[id] = true` no store, EmbeddedTerminal monta naturalmente.
- **Session delete**: cleanup da localStorage key no listener `session/deleted` do store.

## Files

### Modificar

- `src/shared/ipc.ts` — adicionar `sessionId?` em `PtySpawnRequest`; novo channel `SHORTCUT_TOGGLE_EMBEDDED`; novo método `onToggleEmbedded` em `DeckShortcutsApi`.
- `src/main/ipc-handlers.ts` — handler `pty:spawn` injeta `DECK_SESSION_ID` quando `req.sessionId` presente.
- `src/preload/index.ts` — expor `shortcuts.onToggleEmbedded`.
- `src/preload/index.d.ts` — tipos correspondentes.
- `src/main/menu.ts` — 2 menu entries (Ctrl+\` + Cmd+J).
- `src/main/index.ts` — wire-up do channel novo (se houver pattern central de forwarding; senão é só o menu mandando direto).
- `src/renderer/src/stores/deck.ts` — `embeddedToggleMap`, `embeddedFocusMap`, actions, hidratação from localStorage no subscribe (quando ptyId vira !== null), cleanup no `session/deleted`.
- `src/renderer/src/hooks/useDeckShortcuts.ts` — listener `onToggleEmbedded`.
- `src/renderer/src/components/terminal/TerminalHost.tsx` — montar `SessionSplit` no lugar de `SessionTerminal` direto.
- `src/renderer/src/components/terminal/SessionTerminal.tsx` — adicionar prop `focused: boolean`; respeitar em useLayoutEffect; click handler que chama callback `onFocusRequest`.

### Criar

- `src/renderer/src/components/terminal/SessionSplit.tsx` — composição: top `SessionTerminal` + (opcional) handle + `EmbeddedTerminal`. Calcula heights via ratio. ResizeObserver no container roteia mudanças pra ambos.
- `src/renderer/src/components/terminal/EmbeddedTerminal.tsx` — fork de `UtilityTerminal.tsx` com 3 mudanças: (1) prop `sessionId` + passa em `pty.spawn`, (2) prop `focused`, (3) sem `useUtilityCwd` (recebe cwd via prop).
- `src/renderer/src/components/terminal/ResizableSplitHandle.tsx` — handle horizontal (axis Y); inspirado em `ResizablePanel.tsx` mas eixo Y. Drag commit grava `localStorage['deck:embeddedTerminalRatio']`.
- `src/renderer/src/lib/embedded-terminal-storage.ts` — helpers `getEmbeddedToggle/set/clear`, `getEmbeddedRatio/set`, com clamp [0.1, 0.6] e parse defensivo.

### Deletar

Nenhum.

## Tasks

Ordem é dependency-aware. Cada item é testável standalone (typecheck verde após cada um).

- [ ] **T1** — Estender `PtySpawnRequest` com `sessionId?: SessionId` em `src/shared/ipc.ts`. Atualizar handler em `src/main/ipc-handlers.ts` pra injetar `DECK_SESSION_ID`. Verificar `pnpm typecheck`.
- [ ] **T2** — Adicionar canal `IPC.SHORTCUT_TOGGLE_EMBEDDED` + método `onToggleEmbedded` em `DeckShortcutsApi`. Wire-up em preload (`src/preload/index.ts` + `.d.ts`). `pnpm typecheck`.
- [ ] **T3** — Adicionar 2 menu entries em `src/main/menu.ts` (Ctrl+\` primário, Cmd+J fallback) → `IPC.SHORTCUT_TOGGLE_EMBEDDED`. Smoke test manual: dev mode, abrir DevTools, ver evento chegando.
- [ ] **T4** — Criar `src/renderer/src/lib/embedded-terminal-storage.ts` com helpers de localStorage (toggle per-session, ratio global). Tests inline manuais via console.
- [ ] **T5** — Adicionar `embeddedToggleMap`, `embeddedFocusMap`, actions `toggleEmbeddedTerminal`, `setEmbeddedFocus` em `src/renderer/src/stores/deck.ts`. Hidratar from localStorage quando `ptyId` vira `!== null` no listener `session/updated`. Cleanup em `session/deleted`. State machine 3 estados.
- [ ] **T6** — Criar `EmbeddedTerminal.tsx` (fork de `UtilityTerminal.tsx` com props `sessionId`, `cwd`, `visible`, `focused`, `ratio?`). Spawn via `pty.spawn({ sessionId, ... })`. Kill on unmount.
- [ ] **T7** — Criar `ResizableSplitHandle.tsx` (axis Y). Drag atualiza height inline; commit grava localStorage ratio.
- [ ] **T8** — Criar `SessionSplit.tsx`: top SessionTerminal + (cond) handle + EmbeddedTerminal. Tomar `sessionId`. Lê `embeddedToggleMap[sessionId]` + `embeddedFocusMap[sessionId]`.
- [ ] **T9** — Refactor `TerminalHost.tsx`: substituir `<SessionTerminal/>` por `<SessionSplit/>`. Mesma keying por sessionId, mesma `visible`.
- [ ] **T10** — Adicionar listener em `useDeckShortcuts.ts` pra `onToggleEmbedded`.
- [ ] **T11** — Adicionar prop `focused: boolean` em `SessionTerminal.tsx`; aplicar `term.focus()` quando muda; click handler chama callback `onFocusRequest`.
- [ ] **T12** — `pnpm typecheck && pnpm lint`. Zerar warnings.

## Test plan

### Manual (Douglas roda)

Cenários golden path:

1. **Toggle básico**: session claude-code attached → Ctrl+\` → terminal aparece embaixo, foco no embedded → digito `pnpm dev` → roda. Ctrl+\` de novo → some.
2. **State machine de foco**: terminal embedded ON, clico no Claude (top) → foco vai pro top. Ctrl+\` → foco volta pro embedded (não esconde). Ctrl+\` de novo → esconde.
3. **Cmd+J fallback**: mesmo comportamento que Ctrl+\`.
4. **Resize divisor**: arrasto handle pro meio → ambos redimensionam, xterm refit. Solto → ratio persiste em localStorage. Reload app → ratio mantido.
5. **Per-session toggle**: session A toggle ON, session B toggle OFF. Switch entre elas → A mostra embedded, B não. Reload → estado preservado per-session.
6. **Ratio global**: ajusto ratio na session A → vou na session B (toggle ON), embedded aparece com mesmo ratio.
7. **Re-attach respawna**: session com toggle ON, dev server rodando → Cmd+W (detach) → embedded morre. Clico session → re-attach → embedded respawna automático.
8. **Session delete cleanup**: session com toggle ON salvo em localStorage → deleto session → key some do localStorage.
9. **Funciona em todos os tipos**: testar em executor claude-code, planner claude-code, shell, ssh — embedded terminal abre `zsh -il` local em `session.cwd` em todos.
10. **DECK_SESSION_ID**: dentro do embedded, `echo $DECK_SESSION_ID` retorna o id da session pai.

### Automatizado

- `pnpm typecheck` (web + node) — passa.
- `pnpm lint` — sem warnings novos.
- Smoke tests existentes (`pnpm db:smoke`, `pnpm session:smoke`) — não regridem (não tocamos session-manager nem db).

## Rollback

Reverter atomicamente é simples — não há migration nem mudança de schema. `git revert` do PR. localStorage keys novas (`deck:embeddedTerminal:*`, `deck:embeddedTerminalRatio`) ficam órfãs no usuário; tolerável.

Riscos de regressão:

- `pty:spawn` IPC com novo campo opcional — sem impacto se não usado (UtilityTerminal segue igual).
- Menu novo — sem impacto fora dos 2 atalhos novos.
- TerminalHost refactor — wrap em SessionSplit pode ter bug de keying; testar cenário 5 e 7 com cuidado.

## Open questions

Nenhuma bloqueante. Notar durante implementação:

- xterm `term.focus()` em container `display: none` é no-op? Validar no T11. Se for, mover focus call pro `useLayoutEffect` quando `visible && focused` ambos true.
- `ResizeObserver` no SessionSplit container vai disparar nos dois children quando ratio muda; throttle/debounce já presente no SessionTerminal (100ms) — replicar no Embedded.
