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

### [Phase 3 / C2] Trocar branch exige sair do Deck para terminal/IDE

- **Status:** ✅ RESOLVED in v0.3.0-beta.7
- **Descrição:** para trocar de branch em qualquer workspace era necessário abrir terminal externo
  ou IDE, rodar `git checkout <branch>`, e voltar ao Deck. Sem visibilidade da branch ativa
  diretamente no header da session.
- **Impacto:** médio. Ocorria múltiplas vezes por dia em daily drive com 3-5 sessions paralelas
  em projetos distintos.
- **Workaround:** abrir terminal ou IDE externo para o cwd da session.
- **Resolução:** branch switcher integrado no SessionHeader ao lado do ConfigBadge.
  - Ícone git-branch + nome da branch atual (truncado em 22 chars) visível enquanto session attached
  - Click abre dropdown com branches locais; branch ativa marcada com ●
  - Cmd+Shift+B abre o mesmo dropdown via shortcut global
  - Uncommitted changes: toast confirm com [Stash & Switch] [Cancel]
  - Detached HEAD: ícone git-commit + `@ <SHA-7>`, tooltip "Detached HEAD"
  - Session idle: indicador dimmed, tooltip "Attach session to switch branches"
  - **Limitação conhecida:** branch no header fica stale se user troca branch externamente (terminal/IDE)
    sem re-attach da session. Refresh ocorre ao abrir dropdown (pull on open).
  - Search filter e keyboard nav adicionados em v0.3.0-beta.7: input auto-focused no topo do dropdown,
    substring match case-insensitive, Arrow Up/Down/Enter/Esc, scrollIntoView block:nearest.

---

## Tentativas e reversões

### Working state via UserPromptSubmit (revertido em v0.3.0-beta.5)

Tentativa: adicionar estado visual 'working' (azul pulsante) para sessions com CC
processando, via hook UserPromptSubmit.

Razão da reversão:

- Hook-based detection acumulou múltiplas camadas de fragilidade
- Bugs de timing entre store action, filter active session, e transições de estado
  pending→working
- Múltiplos hooks competindo no UserPromptSubmit (agent-deck, superset, deck) aumentaram
  superfície de erro
- Daily drive em uso real revelou comportamento inconsistente: estado preso, transições
  não confiáveis, working não aparecendo em casos esperados
- Custo de manutenção e debug > valor entregue ao usuário

Aprendizado:

- Hooks do CC são adequados para eventos de conclusão (Stop, Notification), não para
  detectar estado de execução em andamento
- "Está executando" pode ser inferido implicitamente: dot verde inactive = ainda
  processando (porque se tivesse terminado seria amarelo via Stop hook)
- Detecção precisa de "working" exigiria refactor arquitetural (subprocess control
  direto, estilo opcode), fora do escopo Phase 3

O que ficou da tentativa:

- Idle visual quiet: variant 'working' do StatusDot virou verde ESTÁTICO em vez de
  pulse green. Resolve a friction "verde fica muito tempo erroneamente" registrada antes.
- Investigação documentada do CC hook system (28 eventos, schema UserPromptSubmit,
  edge cases Ctrl+C)

Status atual — 4 estados visuais ativos:

- detached (cinza estático)
- idle (verde estático)
- pending (amarelo pulsante) — Stop hook
- error (vermelho pulsante) — StopFailure hook

Nota de upgrade: settings.json pode conter entry `UserPromptSubmit` órfã de installs
anteriores. Não causa bug — o hook-handler.sh não reconhece mais o evento e o Deck
ignora linhas `working` no events.log. User pode re-rodar Settings → Install para
limpar, mas não é obrigatório.
