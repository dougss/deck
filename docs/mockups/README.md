# Deck — Mockups

Referências visuais canônicas. Arquivos aqui são **alvos de
implementação**, não protótipos executáveis.

## Arquivos

### `deck-phase2-main-screen.html`

- **Origem:** Claude Design (claude.ai/design) handoff bundle,
  exportado originalmente como `deck-fase-2-layout/project/Deck
Main Screen.html`.
- **Propósito:** fonte visual canônica da **Fase 2**. Define
  chrome da janela, sidebar com workspaces, session header,
  terminal canvas, statusbar. Todo token de cor, espaçamento e
  tipografia usado no CSS/Tailwind da Fase 2 deriva deste
  arquivo.
- **Como usar:**
  1. Abrir no browser lado a lado com `pnpm dev` durante a
     implementação de qualquer task de UI (principalmente Tasks
     7–9).
  2. Qualquer desvio aceito (fidelidade <100%) **deve** ser
     registrado em `docs/deck-visual-drift.md`.
  3. Considerado autoritativo até que um novo mockup o
     substitua (então este vira histórico e o novo toma o
     lugar da referência canônica).

## Convenções

- Mockups são HTML/CSS/JS estáticos — nada de build tooling.
- Ler o HTML direto; não renderizar via screenshot a menos que
  explicitamente solicitado (o HTML já tem toda a informação de
  dimensões/cores/layout).
- Não editar diretamente para corrigir implementação — se o
  mockup estiver "errado", abrir discussão antes de mudar.
