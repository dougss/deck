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
  - ✅ RESOLVED in v0.3.0-beta.3

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

- **2026-04-22 09:44** — Homepage com atalhos (algo informativo interessante) - Sem prioridade
- **2026-04-22 09:47** — Git DIFF - visualizar o diff dos arquivos alterados
  - Status: ✅ RESOLVED in v0.3.0-beta.3 — Fork preset adicionado como 5º Open in IDE option

- **2026-04-22 20:24** — Padding X no main - no layout tem um padding no bloco central que esta sem
  - Status: ✅ RESOLVED in v0.3.0-beta.3 — padding wrapper consistente no xterm

- **2026-04-22 20:25** — CMD + key não funciona - Não esta funcionando outras combinações de teclas CMD -> (entre outros) SHIFT + ENTER
  - Status: ✅ RESOLVED in v0.3.0-beta.3 — macos-terminal-keys.ts mapeia combos nativos para ANSI readline; Shift+Enter via \x1b\r + bloqueio de keypress event

- **2026-04-22 21:17** — Integração com hooks do CC para notificar quando atualizações finalizaram (mult-projetos)
  - Status: ✅ RESOLVED via C1 mini hooks (pending build)
  - Limitação: broadcast por workspace (ver "Limitações conhecidas" abaixo)

- **2026-04-23 06:13** — Não consigo abrir links apresentados no Chat com Cmd + click
  - Status: ✅ RESOLVED in v0.3.0-beta.3 — WebLinksAddon com custom handler abre no browser padrão

- **2026-04-24 09:00** — Projetos DENTRO da pasta Leve_saude não estão injetando o .env, só injeta corretamente se iniciar o claude na raiz. Quero que funcione em qualquer diretório DENTRO da pasta Leve_saude.
  - Status: ✅ RESOLVED in v0.3.0-beta.3 — direnv inject no spawn: busca .envrc ancestral; workspaces sem .envrc usam config padrão (zero regression)

- **2026-04-29 06:50** — Tem algum problema com o FOCO do projeto... quando estou em outro app e clico em uma parte específica do app (Ex: no input do claude central) mas o foco anterior era no terminal, o foco CONTINUA no terminal e preciso clicar outra vez para alternar o foco.
- **2026-04-29 08:00** — No Planner, poderíamos ter uma configuração específica para cada sessão/workspace ter seu próprio prompt e permissões (eu criei muito para MEU cenário, mas outras pessoas podem querer adaptar para o seu próprio)

- **2026-04-29** — Planner reattach voltava pra conversa antiga após /clear + restart
  - Context: fez /clear no planner, fechou e reabriu Deck
  - Needed: conversa fresh ao reabrir
  - Friction: --resume recarregava .jsonl inteiro desde primeira mensagem (incluindo testes iniciais do T3 "Test greetings in Portuguese")
  - Root cause: /clear no CC limpa memória mas não toca .jsonl em disco; Deck usava --resume quando .jsonl existia
  - Fix: cada attach() gera novo UUID, spawna com --session-id (nunca --resume). Stop+Reattach = sempre fresh. Workspace switch preserva PTY (não chama attach)
  - Tradeoff aceito: orphan .jsonl acumulam no disco CC (~1-10KB cada, scale insignificante)
  - Status: ✅ FIXED

- **2026-04-29** — T5 Copy/Export modal implementado e cancelado
  - Context: T5 previa modal com textarea mostrando conversa inteira do planner
  - Needed: forma de copiar saída do planner pro executor
  - Friction: modal com conversa inteira não é prático — too much noise, difícil selecionar a parte relevante
  - Lição: selecionar texto direto no xterm resolve melhor; features de polish precisam daily drive ANTES de implementar
  - Severity: N/A — feature cancelada antes de ser adotada
  - Status: ❌ CANCELLED — código removido, nenhum commit gerado

## Limitações conhecidas

### Hook broadcast por workspace

Quando CC termina em 1 session do workspace, TODAS as sessions daquele workspace ganham dot pulsante.

Razão: CC hook envia apenas `cwd`, sem identificador de session específica do Deck. Deck faz broadcast para todas sessions cujo `workspace.path` bate com `cwd`.

Workaround: clicar em cada session para "marcar como vista" (dot volta ao estado normal).

Fix futuro (não priorizado): injetar `DECK_SESSION_ID` como env var no PTY spawn; hook lê a var e escreve no `events.log`; match passa a identificar a session específica.

Status: ACCEPTABLE — workaround OK, daily drive vai revelar se vira dor real.
