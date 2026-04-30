# Friction Log

> Inbox de fricções de uso real. Registro rápido, sem ceremony.
> Quando vira trabalho → cria issue no GitHub e move para "Em andamento".
> Itens resolvidos são limpos a cada 2-3 releases (git preserva history).

## Como usar

1. **Registrar** (10s): adiciona linha em `## Pendente` com `YYYY-MM-DD — descrição`
2. **Triar**: ao decidir trabalhar, cria issue no GitHub e move para `## Em andamento` com link
3. **Resolver**: ao mergear o fix, move para `## Resolvido recente` com a versão

Post-mortems longos não vão aqui — vão no body do PR ou em
`docs/decisions/NNN-titulo.md` se for decisão arquitetural duradoura.

## Pendente

- 2026-04-29 — Foco não alterna ao clicar em outro pane vindo de outro app (precisa 2 cliques)
- 2026-04-29 — Header com tag "claude-levesaude" hardcoded; deveria ser o plano do Claude (ex: Team)
- 2026-04-29 — Planner: prompt/permissions hardcoded para meu setup; outros usuários precisam customizar por session/workspace
- 2026-04-29 — Planner: Liberar para edição e salvar a spec das features dentro do projeto em questão (definir uma estrutura de spec drive)
- 2026-04-29 — Planner: Aprimorar PROMPT para um PLANEJAMENTO MELHOR
- 2026-04-29 — Resize right sidebar - Quando a sidebar esta fechada, se colocar o mouse no local que a sidebar estava aberta, é possível clicar na barra (ela aparece) e redimencionar (memso com a sidebar oculta)
- 2026-04-29 — Workspaces + sessions - Não gosto do fato de ficar reeordenando ao abrir uma nova sessão (isso quebra os atalhos também). Seria interessante ter visível o atanho para cada session cmd 1, cmd 2
- 

## Em andamento

(vazio)

## Resolvido recente

- 2026-04-29 — Sidebar versão hardcoded → v0.4.2 ([#27](https://github.com/dougss/deck/issues/27))
- 2026-04-29 — Right panel pinned state não persiste → v0.4.2 ([#28](https://github.com/dougss/deck/issues/28))
- 2026-04-29 — Planner reattach voltava à conversa antiga após /clear → v0.4.1 (commit 552a6b5)
- 2026-04-22 — Hook broadcast por workspace ao invés de session específica → v0.3.0-beta.5 (DECK_SESSION_ID)
- 2026-04-22 — Branch switcher integrado no header → v0.3.0-beta.7
- 2026-04-22 — direnv inject por ancestral em projetos aninhados → v0.3.0-beta.3
- 2026-04-22 — Cmd+click em links no chat → v0.3.0-beta.3 (WebLinksAddon)
- 2026-04-22 — Padding X no main central → v0.3.0-beta.3
- 2026-04-22 — CMD+key e Shift+Enter via macos-terminal-keys.ts → v0.3.0-beta.3
- 2026-04-22 — Git diff visualizar arquivos alterados (Fork preset) → v0.3.0-beta.3
- 2026-04-22 — Paste duplicando no xterm (double handler) → v0.3.0-beta.2
