# Deck — Fase 3

**Status:** planejamento completo, execução pendente.
**Início previsto:** após tag `v0.2.0` (Fase 2 complete).
**Duração estimada:** 2–3 semanas, 16–22h de implementação distribuídas em 5 tasks.

---

## Contexto

A Fase 2 entregou o Deck como multi-session Claude Code orchestrator funcional (14 tasks, ~4000 linhas, usado em produção pelo próprio autor desde a Task 12). Sessões executor e infraestrutura de PTY, SQLite, IPC, store e UI estão maduras.

A Fase 3 endereça uma observação feita durante o uso real: o ciclo **planejar → executar** é quebrado hoje. Usuário planeja em Claude.ai/Desktop em outra janela, executa no Deck. Fricção de copy/paste, context switch de apps, perda de plano quando faz `/clear` no executor. Muito valor está em eliminar esta fricção.

---

## Objetivos da Fase 3

1. Embutir capacidade de planejamento conversacional dentro do Deck via sidebar direita.
2. Integrar abertura direta de IDE externa (Zed/Cursor/VS Code) a partir do workspace.
3. Facilitar ponte planner → executor via copy/export/send (sem automação agressiva).

---

## Não-objetivos (explicitamente fora de escopo)

- **Auto-rename de sessões** via parsing de output. Viola §6 da constituição. Se virar prioridade no futuro, implementar versão manual (botão "Auto-name" que chama `/summary` e propõe nome).
- **Tool use customizado via API Anthropic direta.** Planner usa `claude` CLI nativo, reusa infra da Fase 2, zero custo extra, zero gerência de API keys.
- **MCP server dedicado.** Descartado após análise — não resolve fricção de multi-tela e adiciona complexidade de setup.
- **Persistência de buffer xterm.** Fica pra Fase 4 se dor real aparecer.
- **Comando palette (⌘K).** Feature interessante mas ortogonal.
- **Drag-to-reorder sessions.** Fora de escopo.
- **Themes.** Fora de escopo.

---

## Decisões arquiteturais fechadas

Estas decisões foram discutidas e aprovadas antes do planejamento das tasks. São imutáveis durante a execução da Fase 3 salvo revisão explícita.

### D1 — Escopo do planner: 1 por workspace

Cada workspace tem exatamente 1 planner session (ou zero). Workspace ativo determina qual planner está visível na sidebar direita. Planner de workspace não ativo continua rodando em background se attached, apenas oculto.

Mental model: planner:workspace = 1:1. Força foco, reusa infra de sessions.

### D2 — Persistência entre restarts: sim

Planner session persiste no DB como qualquer session. Ao abrir Deck após restart, planner aparece como idle (como executor). Click pra re-attach. Usa `claude -c` no spawn pra retomar conversa automaticamente no mesmo cwd.

### D3 — Sidebar esquerda: só executors

`useSessionsByWorkspace` filtra por `kind = 'executor'`. Planners nunca aparecem na sidebar esquerda. Planner tem UI dedicada na sidebar direita.

### D4 — Auth do planner: mesma do workspace

Planner herda auth/config do workspace via direnv + `CLAUDE_CONFIG_DIR`. Workspace Leve Saúde → planner usa config `~/.claude-levesaude`. Workspace Personal → planner usa Max (`~/.claude`).

Semanticamente correto: planner de projeto corporativo gasta quota corporativa.

### D5 — Toggle shortcut: `⌘\`

`⌘\` toggla sidebar direita (planner). Padrão compatível com VS Code (⌘B é esquerda lá, ⌘\ é split). `⌘Shift+P` foca input do planner quando aberto.

### D6 — Sidebar direita inicia colapsada

Default fechada ao abrir o app. User abre explicitamente via toggle. Evita surpresa e preserva área do executor principal pra quem não usa planner.

### D7 — Open in IDE: Zed, Cursor, VS Code + custom

Primeira versão suporta presets nativos pra Zed, Cursor, VS Code. Opção "custom" permite comando arbitrário. Detecção automática de instalação **não** é feita — usuário configura o preferido em settings.

### D8 — Open in IDE: context menu do workspace

Entrada única via right-click workspace → "Open in [editor]". Sem botão visível no workspace header (evita overcrowd do row). Futuro: atalho de teclado pode ser adicionado na T4 se demanda aparecer.

---

## Flags e configuração do planner (spec técnica)

### Spawn command

```bash
claude \
  --disallowedTools Bash Edit Write \
  --append-system-prompt "<planner-prompt>" \
  -c
```

Cwd = `workspace.path` (direnv ativa auth automaticamente via CLAUDE_CONFIG_DIR).

### System prompt injetado

```
You are a planning assistant operating inside Deck, a multi-session Claude Code orchestrator.

Your role:
- Discuss architecture, propose specs, analyze code
- Ask questions to clarify requirements before suggesting solutions
- Point out trade-offs and edge cases
- Read files using the Read tool when relevant

You MUST NOT:
- Edit any files
- Run shell commands
- Execute tests or builds
- Modify git state

When the user is ready to execute your plan, they will switch to a separate executor session in the main area of Deck. Your job is to produce clear specifications and reasoning, not to implement.
```

### Disallowed tools

`Bash`, `Edit`, `Write` bloqueiam execução. `Read` fica permitido (planner precisa ler código). Outros tools default do CC (como web search se existir) ficam permitidos.

### Verificação antes da T3

Testar manualmente no terminal antes de implementar spawn no Deck:

```bash
cd ~/Projects/deck
claude --disallowedTools Bash Edit Write --append-system-prompt "You are a planner..."
```

Confirmar que:

1. CC inicia sem erro
2. Prompt "analise session-manager.ts" → CC usa Read, discute, não propõe edit
3. Prompt "rode pnpm typecheck" → CC recusa, explica que não pode executar
4. Prompt "edite X pra Y" → CC recusa, sugere spec textual

Se qualquer um falhar, revisar flags antes de T3.

---

## Tasks

### T1 — Open in IDE

**Escopo:** S (2–3h). Independente, sem dependências. Warm-up da fase.

**Objetivo:** permitir abertura rápida de editor externo apontando pro path do workspace.

**Arquitetura:**

- Nova tabela/coluna de settings global ou arquivo JSON em user data dir.
- Config: `preferredEditor: 'zed' | 'cursor' | 'vscode' | 'custom'`, `customEditorCommand?: string`.
- Context menu do workspace ganha item "Open in [editor]".
- Handler IPC `system:open-in-editor` em `src/main/ipc-handlers-system.ts` (arquivo novo).
- Implementação: `child_process.exec(command, { cwd: workspacePath })`.

**Mapping de comandos default:**

- Zed: `zed "<path>"`
- Cursor: `cursor "<path>"`
- VS Code: `code "<path>"`
- Custom: `<user-defined-command> "<path>"`

**Settings UI:**

- Primeira invocação sem preset configurado: dialog "Escolha seu editor preferido" com 4 opções.
- Salva em `~/Library/Application Support/Deck/settings.json`.
- Settings podem ser alteradas depois via ícone gear na sidebar footer (já existe botão, só wire).

**Arquivos:**

- Novos:
  - `src/main/ipc-handlers-system.ts` (namespace system:\*)
  - `src/main/settings-manager.ts` (read/write settings.json)
  - `src/renderer/src/components/settings/SettingsDialog.tsx`
  - `src/renderer/src/components/settings/EditorPreferenceDialog.tsx`
- Modificados:
  - `src/shared/ipc.ts` (SYSTEM_OPEN_IN_EDITOR, SETTINGS_GET, SETTINGS_SET)
  - `src/preload/index.ts` (expõe `window.deck.system.openInEditor`, `window.deck.settings.*`)
  - `src/main/index.ts` (registra handlers)
  - `src/renderer/src/components/sidebar/WorkspaceContextMenu.tsx` (item Open in IDE)
  - `src/renderer/src/components/sidebar/SidebarFooter.tsx` (wire gear button)

**Validação:**

1. Setting não configurado + click "Open in IDE" → abre dialog de escolha
2. Escolhe Zed → salva setting → futuros clicks abrem Zed direto
3. Settings dialog via gear → permite trocar editor
4. Custom editor com comando inválido → silent fail (log no console, não crasheia app)
5. Workspace com path inexistente (needsSetup=true) → item disabled no context menu

**Commit:** `feat(phase3-t1): open in IDE integration`

---

### T2 — Migration v2 + sidebar direita scaffold

**Escopo:** M (3–4h).

**Objetivo:** preparar infraestrutura de DB e UI pra hospedar planner, sem spawnar planner ainda.

**Arquitetura:**

**DB migration v2:**

```sql
ALTER TABLE sessions ADD COLUMN kind TEXT NOT NULL DEFAULT 'executor';
PRAGMA user_version = 2;
```

Migration runner em `src/main/database.ts` detecta `user_version=1`, roda ALTER, seta 2. Idempotente.

**SessionManager kind-aware:**

- `rowToSession()` lê `kind` do DB, default 'executor' pra rows antigas
- `create()` aceita `kind?: 'executor' | 'planner'`, default 'executor'
- Todos os métodos existentes preservam comportamento atual pra executors

**Sidebar direita scaffold:**

- Novo componente `src/renderer/src/components/sidebar-right/SidebarRight.tsx`
- Colapsável, width default 0 (colapsada), expandida = 450px
- Border-left sutil quando expandida
- Empty state: "Planner sidebar (Task 3 will add content)"
- Toggle via `⌘\` — registrado no Menu da Task 14, adicionar novo item "Toggle Planner" em View menu

**Store:**

- Novo state: `isRightSidebarOpen: boolean` (default false)
- Actions: `toggleRightSidebar()`, `openRightSidebar()`, `closeRightSidebar()`

**Layout ajustado:**

- `AppBody` vira 3-column: `[left 280] [main flex-1] [right width-or-0]`
- Right sidebar width reativo ao store
- Transição CSS suave ao toggle (200ms ease)

**Arquivos:**

- Novos:
  - `src/renderer/src/components/sidebar-right/SidebarRight.tsx`
  - `src/renderer/src/components/sidebar-right/PlannerEmptyState.tsx` (placeholder pra T3)
- Modificados:
  - `src/main/database.ts` (migration runner v1 → v2)
  - `src/shared/ipc.ts` (Session type ganha `kind`)
  - `src/main/session-manager.ts` (kind-aware)
  - `src/renderer/src/stores/deck.ts` (isRightSidebarOpen + actions)
  - `src/renderer/src/components/shell/AppBody.tsx` (3-column layout)
  - `src/main/menu.ts` (item "Toggle Planner" em View, accelerator `⌘\`)
  - `src/renderer/src/hooks/useDeckShortcuts.ts` (handle shortcut)

**Validação:**

1. Migration roda automático no boot de v1 DB, sem perda de dados
2. Sessions existentes têm `kind='executor'` após migration
3. `⌘\` abre/fecha sidebar direita
4. Sidebar fechada: layout igual Fase 2, zero diferença
5. Sidebar aberta: main area encolhe, planner placeholder visível
6. Filter na sidebar esquerda: todas sessions existentes aparecem normalmente (são executor)
7. Regressão: multi-session, CRUD, shortcuts Task 14 funcionam

**Commit:** `feat(phase3-t2): migration v2 + right sidebar scaffold`

---

### T3 — Planner spawn + CC integration ✅ COMPLETE (2026-04-29)

**Escopo:** L (6–8h). Task crítica da Fase 3.

**Objetivo:** planner session funcional rodando CC em modo planner na sidebar direita.

**Dependência:** T2 completa. Teste manual das flags CC feito (seção "Verificação" acima).

**Arquitetura:**

**Planner spawn:**

- Reusa `SessionManager.create()` com `kind: 'planner'`
- Command armazenado no DB: `claude --disallowedTools Bash Edit Write --append-system-prompt "<prompt>" -c`
- System prompt do planner em `src/shared/planner-prompt.ts` (constante exportada)
- Cwd = workspace.path (direnv ativa auth)

**Planner UI na sidebar direita:**

- Header: "Planner · [Workspace Name]" + status dot
- Empty state (quando workspace ativo não tem planner): "+ Start planner for [Workspace Name]" button
- Attached state: xterm renderizado dentro da sidebar
- Disabled quando `workspace.needsSetup = true` (path não existe)

**Reuso de TerminalHost:**

- TerminalHost hoje renderiza xterm pra executor ativo na main area
- Alternativa 1: componente separado `PlannerTerminalHost` dentro da sidebar direita
- Alternativa 2: TerminalHost ganha prop `filter: 'executor' | 'planner'`
- Decisão: **Alternativa 1**. Isolamento de responsabilidades, evita branching lógico complicado.

**Filtering:**

- `useSessionsByWorkspace(workspaceId)` (selector existente) ganha parâmetro opcional `kind`
- Default `kind='executor'` preserva comportamento atual
- Sidebar esquerda passa `kind='executor'`
- Sidebar direita passa `kind='planner'` (mas só 1 esperada)

**Active planner tracking:**

- Store ganha `activePlannerSessionId: string | null`
- Derivado automaticamente: planner do workspace ativo
- Atualiza quando workspace ativo muda

**Switch workspace = switch planner:**

- User clica workspace diferente na sidebar esquerda
- Sidebar direita atualiza pra mostrar planner daquele workspace (ou empty state)
- PlannerTerminalHost desmonta xterm anterior, monta novo (mesma lógica da Task 10 multi-session)
- Planner de workspace anterior continua rodando em background se attached

**CLAUDE.md loading:**

- CC já carrega CLAUDE.md automaticamente do cwd
- Nada a fazer no Deck, só garantir que cwd está correto

**Status reporting:**

- Planner aparece em contadores globais? **Não** na Task 14 Statusbar (são só executors). Decisão: adicionar contador separado "1 planner" ou deixar implícito?
- Decisão pra T3: StatusBar ignora planners. Mantém semântica de contadores = executors.

**Arquivos:**

- Novos:
  - `src/shared/planner-prompt.ts` (constante do system prompt)
  - `src/renderer/src/components/sidebar-right/PlannerHeader.tsx`
  - `src/renderer/src/components/sidebar-right/PlannerEmptyState.tsx` (substitui placeholder da T2)
  - `src/renderer/src/components/sidebar-right/PlannerTerminalHost.tsx`
  - `src/renderer/src/components/sidebar-right/PlannerSessionTerminal.tsx`
- Modificados:
  - `src/main/session-manager.ts` (create kind-aware já feito T2, aqui usamos)
  - `src/renderer/src/stores/deck.ts` (activePlannerSessionId derivado, selector)
  - `src/renderer/src/hooks/useSessions.ts` (kind parameter)
  - `src/renderer/src/components/sidebar-right/SidebarRight.tsx` (render PlannerHeader + Terminal ou EmptyState)

**Validação:**

1. Abre sidebar direita em workspace sem planner → empty state com botão
2. Click "+ Start planner" → cria session kind='planner', auto-attach, xterm aparece
3. Conversa com CC funciona normalmente (input funciona, output renderiza)
4. Teste: "analise session-manager.ts" → CC lê e responde, não edita
5. Teste: "rode pnpm test" → CC recusa educadamente
6. Troca workspace → planner anterior some da view (continua rodando), planner novo aparece
7. Volta pro workspace anterior → planner anterior reaparece com buffer preservado (mesma lógica Task 10)
8. Cmd+Q → planner detach limpo, pid zombie = 0
9. Restart app → planner aparece idle, click re-attach, `claude -c` retoma conversa
10. Regressão: executor sessions funcionam normal, CRUD OK, shortcuts OK

**Commit:** `feat(phase3-t3): planner spawn and CC integration`

**Lessons learned (2026-04-29):**

- `--session-id <uuid>` é single-use: cria sessão CC com UUID específico, mas marca como "in use" permanentemente — não pode ser reutilizado para retomar (mesmo após deletar `.jsonl`).
- Re-attach original usava `--resume <uuid>`. **Descartado após daily drive:** `/clear` no CC limpa contexto em memória mas NÃO toca o `.jsonl` em disco. `--resume` recarregava o arquivo completo desde a primeira mensagem — Douglas via conversa de testes inicial ("Test greetings in Portuguese") ao reabrir o app.
- **Solução final (fix pós-T3):** cada `attach()` de planner gera novo UUID via `randomUUID()`, atualiza `claude_session_id` e `command` no DB, spawna com `--session-id <novo>`. Stop + Reattach = sempre fresh. Workspace switch preserva PTY e buffer (não chama `attach()`). Orphan `.jsonl` acumulam no disco do CC (~1–10KB cada) — scale insignificante.
- Edge case original (CC crash antes de gravar `.jsonl`) não se aplica mais — cada attach é sempre `--session-id`, nunca `--resume`.
- Planner cwd é snapshot do `activeSession.cwd` no momento da criação — não re-sincroniza.
- `PlannerSessionTerminal.tsx` não foi necessário — `SessionTerminal` existente funciona sem modificação.
- `TerminalHost` tinha bug latente: sem filtro `kind === 'executor'`, planners attached criariam ghost terminals invisíveis na main area.
- **Refactor pós-uso real (2026-04-29):** plano original dizia 1 planner por workspace; uso real mostrou que 1 planner por session executor é o modelo correto. Refactor: `parent_session_id` FK com ON DELETE CASCADE, selector por `parentSessionId === activeSessionId`, cwd snapshot do executor. Migration v5 deletou planners legados (workspace-scoped sem parent válido).

---

### T4 — Sidebar polish ✅ COMPLETE (2026-04-29)

**Escopo:** S-M (2–3h).

**Objetivo:** refinamentos de UX da sidebar direita.

**Features:**

**Resizable width:**

- Handle de resize no border esquerdo da sidebar direita
- Min 350px, max 700px
- Largura persistida em store (não localStorage, consistência)
- Drag suave, sem flicker
- Double-click no handle reseta pra default (450px)

**Keyboard shortcuts:**

- `⌘\` toggle (já implementado T2)
- `⌘Shift+P` — foca input do planner (se aberto). Se fechado, abre + foca.
- Both via Menu + IPC pattern da Task 14

**Header enriquecido:**

- Nome do workspace com accent color
- Status dot (idle/working)
- Botão "⋯" com menu: Stop planner / Delete planner / Restart planner

**Context menu no planner:**

- Right-click no body da sidebar right (área do xterm)
- Opções: Clear scroll, Copy all (copia buffer do xterm pra clipboard)

**Arquivos:**

- Modificados:
  - `src/renderer/src/components/sidebar-right/SidebarRight.tsx` (resize handle)
  - `src/renderer/src/components/sidebar-right/PlannerHeader.tsx` (menu + status)
  - `src/renderer/src/components/sidebar-right/PlannerTerminalHost.tsx` (context menu)
  - `src/renderer/src/stores/deck.ts` (rightSidebarWidth state + action)
  - `src/main/menu.ts` (Planner menu com items)

**Validação:**

1. Resize funciona smoothly, largura persiste após reload
2. Double-click reset funciona
3. `⌘Shift+P` foca input mesmo se sidebar fechada (abre + foca)
4. Menu "⋯" → Stop planner funciona (PTY morre, xterm unmount, idle state)
5. Menu "⋯" → Delete planner → confirmação → session deletada do DB
6. Copy all copia buffer completo pro clipboard
7. Regressão: tudo da Fase 2 e Task 3 da Fase 3 preservado

**Delivered (via #23/#26):** Resizable left sidebar + right panel entregues. Demais features (⌘Shift+P, Delete/Restart menu, Clear/Copy context menu) descartadas após uso real — `/clear` interno do CC resolve clear, botão Stop resolve kill. Status dot e header enriquecido implementados no PlannerHeader.

**Commit:** `feat: resizable left sidebar and right panel (#23, #26)`

---

### T5 — Integration helpers ❌ CANCELLED (2026-04-29)

**Escopo:** M (3–4h).

**Objetivo:** facilitar ponte planner → executor, reduzir copy/paste manual.

**Features:**

**Copy last planner response:**

- Botão flutuante ou item de menu "Copy last response"
- Extrai última resposta do assistant do buffer do xterm
- Heurística: busca do final do buffer pra trás, encontra início da última resposta do Claude
- Copia pra clipboard
- Toast ou feedback visual breve ("Copied!")

**Save conversation as markdown:**

- Item de menu "Export conversation..."
- Abre dialog nativo pra escolher destino
- Default: `~/Projects/[workspace-name]/docs/plans/YYYY-MM-DD-planner.md`
- Formato: parseia buffer do xterm pra extrair user/assistant turns
- Metadata no topo: workspace, data, duração da conversa

**Send to active executor (opcional, complexo):**

- Se executor ativo existe no workspace atual
- Item de menu "Send last response to executor"
- Escreve o conteúdo via `window.deck.pty.write(executorPtyId, content)`
- User vê aparecendo no xterm do executor, pode editar antes de submeter
- **Avaliar complexidade durante T5**. Se complexo, posterga pra T6 opcional.

**Arquivos:**

- Novos:
  - `src/renderer/src/lib/planner-buffer-parser.ts` (extrai turns do xterm buffer)
  - `src/renderer/src/lib/markdown-exporter.ts` (formata markdown)
- Modificados:
  - `src/renderer/src/components/sidebar-right/PlannerHeader.tsx` (adiciona items no menu "⋯")
  - `src/shared/ipc.ts` (novos canais se precisar de file write)
  - `src/main/ipc-handlers-system.ts` (handler save markdown via native dialog)

**Heurística de parsing:**

- xterm buffer tem controle ANSI, precisa limpar
- Usar `xterm.js` serialize addon ou escrever parser minimal
- Detectar marcadores do CC (tipo "Human:" / "Assistant:" ou boxes ASCII) — **testar e iterar**
- Aceitar que parsing pode falhar em casos edge, fallback = copy all

**Validação:**

1. Conversa planner com 5+ turnos → Copy last response copia só a última resposta completa
2. Export → arquivo markdown gerado com user/assistant turns estruturados
3. Se "Send to executor" implementado: testa envio, user vê output aparecendo no executor
4. Regressão: resto da Fase 3 e Fase 2 preservado

**Motivo do cancelamento (2026-04-29):** Daily drive revelou que o modal mostrando a conversa inteira não é prático. Usuário prefere selecionar texto diretamente no xterm. Copy/Save modal foi implementado, testado, e removido após validação real mostrar que não resolve a dor. Features de polish precisam de daily drive ANTES de implementar, não depois.

**Lição:** build-then-validate é mais caro que validate-then-build. Próxima feature de polish: propor, usar por 1 dia, depois implementar.

**Commit:** `feat(phase3-t5): planner integration helpers` (não gerado — cancelado)

---

## Critérios de encerramento da Fase 3

- Todas as 5 tasks (T1–T5) commitadas e validadas
- Tag `v0.3.0` criada
- `docs/deck-phase3-plan.md` atualizado com status COMPLETE em cada task
- Deck usado em produção por 1+ semana após T3 sem bugs críticos
- Zero regressão comprovada em funcionalidades da Fase 2

---

## Riscos e incógnitas

### R1 — CC pode não respeitar disallowedTools completamente

**STATUS: VALIDADO EM 2026-04-21**
Teste manual confirmou: CC com --disallowedTools Bash Edit Write +
--append-system-prompt comporta-se corretamente como planner.
Recusa execução, oferece specs textuais, analisa código via Read tool.
Ver docs/deck-phase3-validation.md para output completo.

### R2 — Buffer parsing pra export markdown pode ser frágil

**Probabilidade:** alta.
**Impacto:** médio.
**Mitigação:** aceitar que export inicial pode ser imperfeito. MVP = copy all works, parsing estruturado vai sendo refinado. Não bloquear Fase 3 por causa disso.

### R3 — Layout 3-column pode quebrar em telas pequenas

**Probabilidade:** média (users com MacBook Air 13").
**Impacto:** médio.
**Mitigação:** default colapsada (D6). User com tela pequena simplesmente não usa planner. Não é bloqueador.

### R4 — `claude -c` resume pode pegar conversa errada

`-c` continua a última conversa no cwd. Se user tem múltiplos `claude` rodando no mesmo cwd (planner + executor), pode bagunçar.
**Probabilidade:** média.
**Impacto:** médio.
**Mitigação:** investigar durante T3. Alternativa: usar `--session-id <uuid>` com UUID estável por planner session (armazenado no DB). Mais preciso, mais trabalho.

---

## Referências

- [deck-constitution.md](./deck-constitution.md) — princípios gerais
- [deck-phase1-spec.md](./deck-phase1-spec.md) — Fase 1
- [deck-phase2-tasks.md](./deck-phase2-tasks.md) — Fase 2
- [deck-visual-drift.md](./deck-visual-drift.md) — drifts aceitos
