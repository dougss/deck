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
