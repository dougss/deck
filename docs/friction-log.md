# Deck — Friction Log

> Registro de limitações conhecidas, workarounds ativos e dívidas de UX/DX
> que não justificam bloquear uma task mas precisam rastreamento.
>
> Diferença de deck-visual-drift.md: aqui ficam problemas de comportamento
> (bugs menores, UX friction), não desvios visuais vs mockup.

---

## Template de entrada

```markdown
### [Phase/Task] Título curto

- **Status:** open | resolved | accepted-as-is
- **Descrição:** o que está errado ou causando fricção.
- **Impacto:** quantas sessions/workspaces afetados, frequência.
- **Workaround:** o que o usuário pode fazer enquanto não está resolvido.
- **Resolução:** (preencher quando resolved) o que foi feito e em qual versão.
```

---

## Entradas

### [Phase 3 / C1] Hook event broadcast por workspace em vez de session específica

- **Status:** ✅ RESOLVED in v0.3.0-beta.5
- **Descrição:** hook-handler.sh enviava apenas `cwd` para events.log. O event-watcher
  fazia broadcast do evento para TODAS as sessions do workspace cujo path coincidia com
  o `cwd` recebido. Com 5 sessions no mesmo workspace, todas ganhavam dot amarelo
  quando qualquer uma delas terminava um comando CC — impossível saber qual session
  precisava de atenção.
- **Impacto:** alto. Afetava todos os workspaces com 2+ sessions. Durante 4 dias de
  daily drive com 3–5 sessions paralelas, o dot amarelo era constantemente ruidoso e
  perdia valor de sinal.
- **Workaround:** alternar para cada session e observar o buffer do xterm para ver qual
  tinha output novo. Manual, lento.
- **Resolução:** `DECK_SESSION_ID=<uuid>` injetado no env do PTY via `session-manager.ts`
  `attach()`. hook-handler.sh lê `$DECK_SESSION_ID` e escreve 4ª coluna em events.log
  (`cwd|event|timestamp|session_id`). event-watcher detecta schema (3-col legado vs
  4-col novo) e faz match exato por session ID quando disponível, com fallback para
  cwd-broadcast em sessions antigas ou sem DECK_SESSION_ID.
  Requer reinstall do hook handler via Settings → Notifications → Install.
