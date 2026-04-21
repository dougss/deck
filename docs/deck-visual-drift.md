# Deck — Visual & Design Drift Log

> Registro de desvios deliberados ou aceitos entre a implementação e
> o mockup de referência (`docs/mockups/deck-phase2-main-screen.html`),
> ou dívidas técnicas menores relacionadas a UI/UX/assets que não
> justificam bloquear uma task mas precisam rastreamento.
>
> Regra: 95% fidelidade é a meta; o 5% restante **sempre** vira
> entrada aqui com plano de mitigação. Nada de drift silencioso.

---

## Template de entrada

```markdown
### [Task N] Título curto do drift

- **Categoria:** typography | color | spacing | layout | asset |
  interaction | other
- **Status:** open | mitigated | accepted-as-is | resolved
- **Descrição:** o que está diferente do mockup / esperado.
- **Motivo:** por que aceitamos o drift (trade-off, limitação
  técnica, decisão de escopo).
- **Impacto:** visível | invisível-ao-usuário | performance | outro.
- **Mitigação planejada:** passos concretos pra resolver (se
  aplicável), ou "aceito permanentemente".
- **Quando revisitar:** task específica, fase, ou gatilho.
```

---

## Entradas

### [Task 1] Bundle de fontes 651KB vs ~300KB estimado

- **Categoria:** asset
- **Status:** accepted-as-is (revisitar se virar dor)
- **Descrição:** os 9 arquivos `.woff2` bundled somam ~651KB
  (Inter 3×110KB, JetBrains Mono 2×93KB, Geist Mono 2×51KB,
  Clash Display 2×16KB), acima da estimativa de ~300KB feita no
  plano da Task 1.
- **Motivo:** Inter e JetBrains Mono vêm com cobertura Unicode
  extensa (latin + latin-ext + cyrillic + greek + vários símbolos)
  já incluída nos `.woff2` oficiais dos repositórios originais.
  Subsetting requer pipeline de build extra e não é justificado
  com o orçamento atual (<1MB é imperceptível no load de um app
  desktop local).
- **Impacto:** invisível-ao-usuário em runtime (load único, cache
  permanente). Apenas ~350KB adicionais no bundle final vs.
  estimativa inicial. Tamanho do `.app` empacotado não é
  problema pra app pessoal self-hosted.
- **Mitigação planejada:** quando fizer sentido (empacotamento
  final pra distribuir, ou se `.app` passar de 200MB), rodar
  `pyftsubset` com `--unicodes=U+0000-00FF,U+0100-017F` (latin +
  latin-ext) — reduz ~70% cada fonte, total esperado <200KB.
  Ferramenta: `pip install fonttools[woff]`. Script automatizável
  em `scripts/subset-fonts.js` ou similar.
- **Quando revisitar:** fase de empacotamento pra distribuição
  (`.dmg`), ou se alguma fonte ultrapassar 150KB no futuro.

### [Task 7] Sidebar vazia — placeholder

- **Categoria:** layout
- **Status:** open
- **Descrição:** mockup mostra sidebar com 3 workspaces, sessões, cores, chevrons e counts. Atual: div `bg-op-surface` de 280px sem conteúdo.
- **Motivo:** escopo deliberado — Task 7 entrega shell frame; sidebar é Task 8.
- **Impacto:** visível (área sem conteúdo à esquerda).
- **Mitigação planejada:** Task 8 implementa `<Sidebar>` completo.
- **Quando revisitar:** Task 8.

### [Task 7] Session header vazio — placeholder

- **Categoria:** layout
- **Status:** open
- **Descrição:** mockup mostra breadcrumb (workspace dot + nome + `/` + sessão), cwd line, badge claude, more button. Atual: div `bg-op-surface-2` de 50px sem conteúdo.
- **Motivo:** escopo deliberado — Task 7 entrega shell frame; session header é Task 9.
- **Impacto:** visível (barra acima do terminal sem conteúdo).
- **Mitigação planejada:** Task 9 implementa `<SessionHeader>`.
- **Quando revisitar:** Task 9.

### [Task 7] StatusBar com dados reais ausentes

- **Categoria:** interaction
- **Status:** open
- **Descrição:** mockup mostra "working • claude opus 4.7 • 47.2k tokens" com pulse verde. Atual: "idle • — • —" (placeholders com tooltip "Available in Phase 3 via Claude Code hooks").
- **Motivo:** dados de status (working/idle) vêm de `activeSession.ptyId` — integração Task 9. Model/tokens dependem de hooks do Claude Code (Fase 3).
- **Impacto:** visível mas funcionalmente correto como placeholder.
- **Mitigação planejada:** Task 9 conecta `working/idle` ao store. Fase 3 via hooks oficiais para model/tokens.
- **Quando revisitar:** Task 9 (working/idle), Fase 3 (model/tokens).

### [Task 7] Token `--op-titlebar` — decisão intencional (não é drift)

- **Categoria:** color
- **Status:** accepted-as-is
- **Descrição:** mockup usa `background: #0b0b0d` hardcoded na titlebar. Implementação criou token semântico `--op-titlebar: #0b0b0d`.
- **Motivo:** cor distinta de `--op-base` (#09090b). Token preserva intenção do mockup com consistência arquitetural.
- **Impacto:** invisível-ao-usuário. Resultado visual idêntico ao mockup.
- **Mitigação planejada:** aceito permanentemente.
- **Quando revisitar:** nunca.

### [Task 8] SessionItem timestamp não auto-refresha em intervalo

- **Categoria:** interaction
- **Status:** accepted-as-is
- **Descrição:** `formatRelativeTime(session.lastActiveAt)` é calculado no render. Não existe `setInterval` refrescando o valor — "2m" não vira "3m" automaticamente sem nova sessão de render.
- **Motivo:** store re-renderiza a cada update de sessão (PTY data, status change), frequência prática suficiente pra uso normal. Interval dedicado adiciona complexidade sem ganho real durante uso ativo.
- **Impacto:** visível apenas em sessões completamente ociosas por longos períodos sem nenhuma atividade no store.
- **Mitigação planejada:** se virar dor em testes longos sem atividade, criar `hooks/useRelativeTime.ts` com `setInterval(30_000)` e usar em `SessionItem`.
- **Quando revisitar:** se o problema for reportado durante uso real.

---

## Design system evolution — Task 7 post-fix

### Double-border pattern (descoberta pós-implementação)

O mockup usa dois borders adjacentes para separar zonas no dark theme:

```
[header bg #18181b]  border-bottom: #27272a  ← chrome side
─────────────────────────────────────────────
[terminal bg #080808] border-top: #1a1a1a    ← terminal side
```

Um border único (#27272a sobre #09090b) tem contraste insuficiente no dark.
Dois borders sobrepostos criam uma separação de ~2px perceptível.
Padrão replicado na borda lateral (sidebar `border-r #27272a` + terminal `border-l #1a1a1a`).

**Implementação:** `border-t border-l border-tv-border` no wrapper do Terminal em `App.tsx`.

### Aliases semânticos de superfície

Tokens `--op-zinc-900/950` para backgrounds estruturais substituídos por aliases semânticos:

| Token            | Valor     | Uso semântico                                                                  |
| ---------------- | --------- | ------------------------------------------------------------------------------ |
| `--op-surface`   | `#09090b` | sidebar (mesma camada que base; sem distinção cromática, separação via border) |
| `--op-surface-2` | `#18181b` | header, statusbar (elevado acima do void do terminal)                          |

Regra: `bg-op-zinc-*` reservado para estados interativos (hover, Kbd, badges). Superfícies estruturais usam `bg-op-surface-*`.
