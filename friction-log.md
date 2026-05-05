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

- 2026-05-05 - Sidebar da direita esta reiniciando a sessão ao fechar/abrir. Deve manter a sessão ativa.
(vazio)

## Em andamento

(vazio)

## Resolvido recente

- 2026-04-29 — Foco não alterna ao clicar em outro pane vindo de outro app (precisa 2 cliques) → vNEXT (commit hash a preencher após commit)
- 2026-04-30 — Embedded terminal panel (split horizontal Ctrl+\` / Cmd+J) → v0.6.0 ([#24](https://github.com/dougss/deck/issues/24), spec `docs/deck-specs/2026-04-30-embedded-terminal-panel.md`)
- 2026-04-29 — Header com tag hardcoded → v0.5.0 (plano do Claude dinâmico no SessionHeader)
- 2026-04-29 — Workspaces/sessions reordenando ao abrir nova sessão + atalhos cmd+N visíveis → v0.5.0
- 2026-04-29 — Planner: prompt/permissions hardcoded → v0.5.0 (workspace + global customization via PlannerSettingsDialog/WorkspaceDialog)
- 2026-04-29 — Planner: spec drive para features → v0.5.0 (`docs/deck-specs/` com convention F4 spec output)
- 2026-04-29 — Planner: aprimorar PROMPT → v0.5.0 (super prompt spec-driven 6 fases F1-F6, hard gate, challenge mandate)
- 2026-04-29 — Resize handle visível com sidebar fechada → v0.5.0 (commit bf19a91)
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
