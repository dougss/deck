# Deck — Fase 2: Plano de Execução

> Referência canônica pra todas as sessões da Fase 2. Use
> `@docs/deck-phase2-tasks.md` pra reabrir o contexto.
> Mockup fonte: `deck-fase-2-layout/project/Deck Main Screen.html`.
> Constituição: `docs/deck-constitution.md`. Fase 1: `docs/deck-phase1-spec.md`.

---

## Status — FASE 2 COMPLETA ✅

**Concluída em:** 2026-04-21
**Tag:** `v0.2.0`

| Task | Título                                               | Status      |
| ---- | ---------------------------------------------------- | ----------- |
| 1    | Design tokens + fontes bundled                       | ✅ COMPLETE |
| 2    | SQLite: infra + schema v1 + seed defaults            | ✅ COMPLETE |
| 3    | Workspace manager + CRUD + IPC `workspace:*`         | ✅ COMPLETE |
| 4    | Session manager + CRUD + IPC `session:*`             | ✅ COMPLETE |
| 5    | Preload bridge: `workspace.*` + `session.*`          | ✅ COMPLETE |
| 6    | Store Zustand + bootstrap do renderer                | ✅ COMPLETE |
| 7    | Shell: AppShell + Titlebar + AppBody + primitivos UI | ✅ COMPLETE |
| 8    | Sidebar estática (read-only)                         | ✅ COMPLETE |
| 9    | SessionHeader + StatusBar                            | ✅ COMPLETE |
| 10   | TerminalHost (N xterms com visibility toggle)        | ✅ COMPLETE |
| 11   | Workspace CRUD UI                                    | ✅ COMPLETE |
| 12   | Session CRUD UI                                      | ✅ COMPLETE |
| 13   | Auto-check paths no boot + StatusBar dinâmica        | ✅ COMPLETE |
| 14   | Keyboard shortcuts + menu nativo macOS               | ✅ COMPLETE |

---

## Decisões de produto (ACKed)

### Decisão #1 — Fontes: bundled local

**ACK:** ✅ aceito.
Bundle de 4 famílias em `resources/fonts/*.woff2`, `@font-face` no
`fonts.css`. Motivo: princípio §5 (zero dependência de rede),
zero FOUT offline. Custo: ~300KB no bundle.

### Decisão #2 — Status bar "model/tokens": placeholder

**ACK:** ✅ aceito **com ajuste**.
Renderizar "—" (travessão) nos dois campos, **com tooltip** no hover
dizendo _"Available in Phase 3 via Claude Code hooks"_. Layout final
preservado desde já; integração real vem na Fase 3 via hooks oficiais.

### Decisão #3 — Session `sub_text`: editável manual

**ACK:** ✅ aceito.
Campo `sub_text` no DB, editável inline pelo usuário. Vazio por
default. **Regra de merge Fase 3**: hooks auto-preenchem **apenas
se vazio**, nunca sobrescrevem input manual.

### Decisão #4 — Seed de 3 workspaces + check de path

**ACK:** ✅ aceito **com ajuste**.
Seed:

- Leve Saúde — `#06b6d4` — `~/Projects/Leve_saude`
- DevSkin — `#ec4899` — `~/Projects/DevSkin`
- Personal — `#8b5cf6` — `~`

Antes de inserir, `fs.existsSync(path)`. Se não existe, insere com
`needs_setup=true`. UI mostra `Lucide AlertCircle` 12px amber ao lado
do nome. Botão "+ New session" fica `disabled` no workspace com flag,
tooltip: _"Workspace path doesn't exist. Edit workspace first."_

### Decisão #5 — Terminal swap: N instances com visibility toggle

**ACK:** ✅ aceito (pré-aprovada, técnica).
N `<Terminal>` montados, `display: none` nos inativos. Refit + resize
ao revelar via `requestAnimationFrame`. Limite prático 20 sessões
(~40MB RAM). Perfil 3-5 sessões cabe confortável.

### Decisão #6 — Escopo persistência: só metadados

**ACK:** ✅ aceito.
Schema v1: `workspaces(id, name, accent_color, path, needs_setup,
ordinal)` + `sessions(id, workspace_id, name, cwd, command, sub_text,
status, created_at, last_active_at)`. Sem scrollback. Scrollback fica
pra v2 se virar dor real (aditivo, zero breaking).

### Decisão #7 — Migration: `PRAGMA user_version` manual

**ACK:** ✅ aceito.
`schema.sql` + função `migrate()` com versões sequenciais.
Drizzle/Kysely considerados e descartados — overkill com 2 tabelas.
Adotar depois quando schema crescer é possível, ~4-6h de trabalho.

---

## Ajustes aprovados pós-ACK

### Ajuste A — Milestone adicional: Task 4

Task 4 (Session Manager) entra na lista de milestones de merge pra
`main`. Motivo: L (4-8h), peça central do backend, merece
ponto de restauração próprio.

**Lista final de milestones:** Tasks **1, 2, 4, 5, 7, 10, 14**.

### Ajuste B — Plano B da Task 10 sem downgrade silencioso

Se "N instances display:none" falhar por razão não prevista, **não**
downgradar sozinho pra dispose+recreate. Parar a task e escalar
discussão — possivelmente avaliar Estratégia C (xterm serializer +
restore) ou outras. Perder scrollback/WebGL silenciosamente não é
aceitável.

### Ajuste C — Validação visual pós-Task 8

Após Task 7 (shell) e Task 8 (sidebar read-only), **pausar antes**
da Task 9. Comparar visualmente com o mockup.
Documentar desalinhamentos em `docs/deck-visual-drift.md`. Aceitar 95%
fidelity na v1 mas registrar o 5% pra próxima iteração. Evita dívida
visual silenciosa.

---

## Tasks (14)

### Task 1 — Design tokens + fontes bundled

- **Escopo IN:** 4 famílias em `resources/fonts/*.woff2`, `fonts.css`
  com `@font-face`, tokens (`--op-*`, `--tv-*`, `--accent-*`, etc.)
  em `main.css`, `@theme inline` atualizado, xterm theme novo
  (`#080808`, cursor `#7c3aed`), BrowserWindow `backgroundColor:
'#09090b'`.
- **Escopo OUT:** layout novo; App.tsx segue renderizando Terminal
  atual.
- **Arquivos novos:** `resources/fonts/*.woff2`,
  `src/renderer/src/assets/fonts.css`.
- **Arquivos modificados:** `main.css`, `Terminal.tsx` (tema xterm),
  `src/main/index.ts` (backgroundColor).
- **Não tocar:** `pty-*`, `ipc-handlers.ts`, `preload/index.ts`,
  `shared/ipc.ts`.
- **Sucesso:** `pnpm dev` abre com bg `#09090b`, terminal `#080808`,
  cursor violeta; fontes em Computed no DevTools; typecheck + build
  verdes; PTY+claude funcionam.
- **Deps:** nenhuma.
- **Estimativa:** **S (1-2h)**.
- **Risco:** licença Clash Display (confirmar Fontshare permite
  redistribuição em apps). Fallback: remover Clash e usar
  `system-ui`.

### Task 2 — SQLite: infra + schema v1 + seed defaults

- **Escopo IN:** `better-sqlite3`; `db/schema.sql`;
  `db/index.ts::initDatabase`; migrations v0→v1; seed de 3 workspaces
  com `fs.existsSync` + `needs_setup`; `scripts/db-smoke.ts` standalone.
- **Escopo OUT:** IPC; integração com main runtime; UI.
- **Arquivos novos:** `src/main/db/{schema.sql,index.ts,migrations.ts}`,
  `scripts/db-smoke.ts`.
- **Arquivos modificados:** `package.json` (deps + script),
  `scripts/postinstall-chmod.js` se necessário (confirmar que
  `electron-rebuild` cobre `better-sqlite3`).
- **Não tocar:** main runtime, PTY, preload.
- **Sucesso:** `pnpm tsx scripts/db-smoke.ts` cria
  `/tmp/deck-smoke.db`, lista 3 workspaces com flags corretos;
  re-rodar não duplica seed; build verde.
- **Deps:** nenhuma.
- **Estimativa:** **M (2-4h)**.
- **Risco:** ABI do `better-sqlite3` com Electron 39 — `@electron/rebuild`
  via `install-app-deps` deve cobrir. Validar cedo.

### Task 3 — Workspace manager + CRUD + IPC `workspace:*`

- **Escopo IN:** `workspace-manager.ts` com `list/get/create/update/
delete/checkPaths`; canais IPC; evento `workspace:updated`; tipos
  em `shared/ipc.ts`.
- **Escopo OUT:** sessions; UI; store Zustand.
- **Arquivos novos:** `src/main/workspace-manager.ts`,
  `src/main/ipc-handlers-workspaces.ts`.
- **Arquivos modificados:** `src/shared/ipc.ts`, `src/main/index.ts`
  (init + registrar handlers, sem tocar `registerPtyHandlers`).
- **Não tocar:** PTY stack inteira; Terminal.
- **Sucesso:** DevTools: `await window.deck.workspace.list()` retorna
  3 workspaces após primeiro boot; CRUD funciona; typecheck verde.
- **Deps:** Task 2.
- **Estimativa:** **M (2-4h)**.
- **Risco:** `checkPaths()` performance com muitos workspaces —
  irrelevante pra <20.

### Task 4 — Session manager + CRUD + IPC `session:*`

- **Escopo IN:** `session-manager.ts` com
  `list/get/create/update/delete/attach/detach`; `attach` spawna PTY
  via `PtyRegistry` existente; `detach` kill + limpa `ptyId`; status
  derivado; canais IPC; evento `session:updated`.
- **Escopo OUT:** UI; auto-spawn no boot.
- **Arquivos novos:** `src/main/session-manager.ts`,
  `src/main/ipc-handlers-sessions.ts`.
- **Arquivos modificados:** `src/shared/ipc.ts`, `src/main/index.ts`.
- **Não tocar:** `pty-manager`, `pty-registry` (session-manager **usa**
  o registry, não muta API).
- **Sucesso:** via DevTools, `session.create` grava no DB;
  `session.attach` spawna zsh→claude, `pty.onData` chega; `detach`
  mata limpo; `ps aux` confirma lifecycle.
- **Deps:** Task 2, Task 3.
- **Estimativa:** **L (4-8h)**.
- **Risco:** atomicidade create+attach. Transação SQLite pro DB,
  spawn **depois** do commit. Spawn falhar deixa session `idle`
  (ok, user tenta de novo).

### Task 5 — Preload bridge: `workspace.*` + `session.*`

- **Escopo IN:** estender `preload/index.ts` com
  `window.deck.workspace` e `window.deck.session`; fan-out de
  `workspace:updated`/`session:updated` via Map<id, Set<cb>>;
  atualizar types globais.
- **Escopo OUT:** UI consumindo; store.
- **Arquivos modificados:** `src/preload/index.ts`,
  `src/renderer/src/types/deck-api.d.ts`.
- **Não tocar:** main, shared (já estendido nas Tasks 3/4).
- **Sucesso:** DevTools: `window.deck.workspace.list()` e
  `.session.list()` retornam; `window.deck.pty.*` **byte-a-byte
  idêntico**.
- **Deps:** Tasks 3, 4.
- **Estimativa:** **S (1-2h)**.
- **Risco:** quebrar preload derruba renderer inteiro. Manter bloco
  `pty` intocado, só **acrescentar**.

### Task 6 — Store Zustand + bootstrap do renderer

- **Escopo IN:** `stores/deck.ts` com `workspaces`, `sessions`,
  `activeSessionId`, `searchQuery`, `expandedWorkspaceIds`; actions;
  `hydrate()` + `onUpdateSubscribe()`; chamada no mount do `<App>`.
- **Escopo OUT:** render de sidebar/header.
- **Arquivos novos:** `src/renderer/src/stores/deck.ts`.
- **Arquivos modificados:** `package.json` (`zustand`), `App.tsx`
  (hydrate + subscribe, mantém Terminal hardcoded).
- **Não tocar:** Terminal, useTerminal, backend.
- **Sucesso:** store mostra 3 workspaces, 0 sessions; criar session
  via DevTools atualiza store via push; app ainda abre claude
  hardcoded.
- **Deps:** Task 5.
- **Estimativa:** **M (2-4h)**.
- **Risco:** loop infinito no subscribe. Subscribe único no
  top-level mount, unsubscribe no unmount.

### Task 7 — Shell: AppShell + Titlebar + AppBody + primitivos UI

- **Escopo IN:** `shell/{AppShell,Titlebar,AppBody}.tsx`; primitivos
  `ui/{Kbd,StatusDot,IconButton}.tsx`; `titleBarStyle: 'hiddenInset'`;
  App.tsx renderiza `<AppShell>` com Terminal legacy no slot main.
- **Escopo OUT:** sidebar; session header; statusbar.
- **Arquivos novos:** acima.
- **Arquivos modificados:** `App.tsx`, `src/main/index.ts`
  (hiddenInset, width/height).
- **Não tocar:** Terminal, useTerminal, stores, backend.
- **Sucesso:** `pnpm dev` abre com traffic lights nativos macOS,
  título "Deck" centralizado draggable; Terminal ocupa resto.
- **Deps:** Task 1.
- **Estimativa:** **S (1-2h)**.
- **Risco:** baixo — macOS-only conforme constituição.

### Task 8 — Sidebar estática (read-only)

- **Escopo IN:** toda a sidebar renderizada a partir do store; click
  em session → `setActive`; chevron expande/colapsa; search filtra
  local; workspace `needs_setup=true` mostra AlertCircle amber com
  tooltip.
- **Escopo OUT:** CRUD ("+ New" disabled, right-click no-op).
- **Arquivos novos:** `components/sidebar/{Sidebar,SidebarHeader,
BrandMark,AccountAvatar,SidebarSearch,WorkspaceList,WorkspaceGroup,
WorkspaceRow,SessionItem,SidebarFooter}.tsx`.
- **Arquivos modificados:** `AppShell` pra montar `<Sidebar>`.
- **Não tocar:** backend, preload, Terminal lifecycle.
- **Sucesso:** após primeiro boot, sidebar mostra 3 workspaces com
  cores/counts; criar session via DevTools aparece via push; DevSkin
  com alert icon; search filtra; active state correto.
- **Deps:** Tasks 6, 7.
- **Estimativa:** **L (4-8h)**.
- **Risco:** desalinhamento visual com mockup (aceitar 95% fidelity,
  drift registrado no `deck-visual-drift.md` conforme ajuste C).

### ⏸️ Checkpoint pós-Task 8 — Validação visual (Ajuste C)

Pausar antes da Task 9. Rodar mockup em browser lado a lado com `pnpm
dev`. Documentar desalinhamentos em `docs/deck-visual-drift.md`.
Aceitar 95% fidelity, registrar o 5% pra próxima iteração.

### Task 9 — SessionHeader + StatusBar

- **Escopo IN:** `main/{SessionHeader,Breadcrumb,CwdLine,
ClaudeConfigBadge,MoreMenuButton,StatusBar}.tsx`; lê
  `activeSessionId`; StatusBar com dot pulse + working/idle +
  separadores + "—" tooltips pra model/tokens (ajuste Decisão #2);
  Kbd hints **apenas visuais**.
- **Escopo OUT:** MoreMenu dropdown; inline edit; shortcuts
  funcionais.
- **Arquivos novos:** acima; `components/ui/Tooltip.tsx` se não
  existir.
- **Arquivos modificados:** `MainArea.tsx` (criar) sanduichando
  header + Terminal + statusbar.
- **Não tocar:** backend; Terminal lifecycle.
- **Sucesso:** com sessão ativa, header correto; sem sessão → empty
  state "Select a session"; hover em "—" mostra tooltip; pulse verde
  quando PTY vivo.
- **Deps:** Task 8.
- **Estimativa:** **M (2-4h)**.
- **Risco:** empty state não está no mockup — rascunho: card central
  "No session active" + hint `⌘N New session`.

### Task 10 — TerminalHost (N xterms com visibility toggle) [CRÍTICA]

- **Escopo IN:** `main/TerminalHost.tsx` itera
  `sessions.filter(s => s.ptyId)`, renderiza `<Terminal>` por id com
  `visible={id===activeId}`; Terminal.tsx aceita `sessionId`,
  `visible`, `existingPtyId?`; `useTerminal` pula spawn se `existingPtyId`,
  refit via `requestAnimationFrame` ao virar `visible=true`.
- **Escopo OUT:** criação via UI (usa DevTools ainda).
- **Arquivos novos:** `components/main/TerminalHost.tsx`.
- **Arquivos modificados:** `Terminal.tsx`, `useTerminal.ts`,
  `App.tsx`, `MainArea.tsx`.
- **Não tocar:** backend PTY lifecycle (já suporta N).
- **Sucesso (teste explícito):**
  1. Via DevTools criar 3 sessões em Personal (cwd=~, command='cd ~ && claude'), attach todas.
  2. Digitar input único em cada (`echo A\r`, `echo B\r`, `echo C\r`).
  3. Alternar via `setActive` 10x.
  4. Cada terminal preserva scrollback/cursor/cor. Zero vazamento entre terminais.
  5. Resize com sessão 2 ativa → `pty:resize` no ptyId certo (ver main log).
  6. Fechar app → `ps aux` zero zumbis (3 × (zsh+claude) mortos).
- **Deps:** Tasks 4, 6, 7, 9.
- **Estimativa:** **L (4-8h)**.
- **Risco (Ajuste B):** se modelo falhar, **não** downgradar pra
  dispose+recreate. Pausar e escalar discussão (possível Estratégia C:
  xterm serializer).

### Task 11 — Workspace CRUD UI

- **Escopo IN:** "+ New" workspace via dialog (name, accent_color
  com swatches + hex input, path via
  `electron.dialog.showOpenDialog`); right-click → Rename / Edit Path
  / Change Color / Delete (confirm); edit de path re-checa `existsSync`.
- **Escopo OUT:** Session CRUD.
- **Arquivos novos:** `components/dialogs/WorkspaceDialog.tsx`,
  `components/sidebar/WorkspaceContextMenu.tsx`.
- **Arquivos modificados:** `SidebarHeader` (+), `WorkspaceRow`
  (right-click), canais pra `workspace:pick-path` se precisar.
- **Não tocar:** session, terminal, main backbone.
- **Sucesso:** criar workspace em `/tmp/teste-deck` (mkdir antes) →
  seed + aparece; rename; editar path pra inexistente → needs_setup
  true; delete com confirm; persistência pós-restart.
- **Deps:** Task 8.
- **Estimativa:** **M (2-4h)**.
- **Risco:** `showOpenDialog` só no main — canal IPC específico.

### Task 12 — Session CRUD UI

- **Escopo IN:** "+ New session" por workspace (disabled se
  `needs_setup`); dialog com `name` default `workspace.name/new-session`,
  `cwd` pré-preenchido; ao confirmar `create+attach`; double-click no
  name → inline rename; double-click em sub_text (ou context menu
  "Edit description") → inline edit; right-click → Stop (detach,
  mantém DB) ou Close (detach + delete).
- **Escopo OUT:** Shortcuts (⌘N etc.).
- **Arquivos novos:** `components/dialogs/SessionDialog.tsx`,
  `components/sidebar/SessionContextMenu.tsx`,
  `components/sidebar/InlineEdit.tsx`.
- **Arquivos modificados:** `SessionItem.tsx`, `WorkspaceGroup.tsx`.
- **Não tocar:** terminal lifecycle.
- **Sucesso:** criar sessão → PTY spawna, Terminal renderiza claude;
  rename/description inline; Stop → dot cinza; Close → remove
  completamente; persistência.
- **Deps:** Tasks 4, 10, 11.
- **Estimativa:** **M (2-4h)**.
- **Risco:** UX do inline edit (Enter confirma, Esc cancela, click
  fora confirma). Componente genérico resolve uma vez.

### Task 13 — Auto-check paths no boot + StatusBar dinâmica

- **Escopo IN:** `initApp` chama `checkPaths()` no ready; StatusBar lê
  `activeSession.ptyId` pra working/idle + `pid:NNNN` em mono pequeno.
- **Escopo OUT:** shortcuts globais.
- **Arquivos modificados:** `StatusBar.tsx`, `src/main/index.ts`.
- **Não tocar:** demais.
- **Sucesso:** deletar `~/Projects/Leve_saude` manualmente → restart
  → Leve vira `needs_setup=true`; StatusBar mostra `pid` real.
- **Deps:** Tasks 3, 9.
- **Estimativa:** **S (1-2h)**.
- **Risco:** baixo.

### Task 14 — Keyboard shortcuts + menu nativo macOS

- **Escopo IN:** `hooks/useShortcuts.ts`; `⌘N` → SessionDialog;
  `⌘W` → fechar sessão ativa (confirm se PTY vivo); `⌘1..⌘9` →
  setActive pra N-ésima sessão (flat, cross-workspace);
  `⌘F` → foca search; `⌘K` → stub "Command Palette coming soon".
  Electron Menu nativo com mesmos accelerators. `⌘Shift+W` → fechar
  janela (preserva convenção macOS).
- **Escopo OUT:** Command Palette funcional; atalhos avançados.
- **Arquivos novos:** `hooks/useShortcuts.ts`, opcional
  `components/dialogs/CommandPaletteStub.tsx`.
- **Arquivos modificados:** `src/main/index.ts` (Menu), `App.tsx`.
- **Não tocar:** demais.
- **Sucesso:** com 5 sessões, `⌘3` ativa 3ª; `⌘N` abre dialog; `⌘W`
  fecha ativa; `⌘F` foca search; menu File mostra accelerators.
- **Deps:** Tasks 10, 12.
- **Estimativa:** **S (1-2h)**.
- **Risco:** conflito `⌘W`. Solução: `⌘W` = fechar sessão, `⌘Shift+W`
  = fechar janela.

---

## Ordem crítica

1–2 paralelizáveis. Depois 3→4→5 (backend pipeline).
6 (store). 7→8 (UI shell + sidebar read-only).
**Checkpoint visual** (Ajuste C). 9 (header/status).
**10 isolada com teste explícito** (Ajuste B protege contra
downgrade silencioso). 11→12 (CRUD). 13→14 (polish).

## Gates de merge pra `main`

Tasks **1, 2, 4, 5, 7, 10, 14** (Ajuste A adicionou a 4).
Tasks intermediárias ficam em feature branch.

## Estimativa total

| Tamanho   | Tasks              | Min     | Max     |
| --------- | ------------------ | ------- | ------- |
| S (1-2h)  | 1, 5, 7, 13, 14    | 5       | 10      |
| M (2-4h)  | 2, 3, 6, 9, 11, 12 | 12      | 24      |
| L (4-8h)  | 4, 8, 10           | 12      | 24      |
| **Total** | **14**             | **29h** | **58h** |

Ritmo 10-20h/semana (constituição §cronograma) → **~2-6 semanas**.
