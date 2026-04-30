# Deck Specs

Specs produzidas pelo PLANNER do Deck (fase F4 do workflow).

## Convenção

Cada spec vive em um arquivo único:

```
docs/deck-specs/YYYY-MM-DD-<slug>.md
```

Exemplos:

- `2026-04-29-planner-superprompt.md`
- `2026-05-03-executor-handoff-button.md`

## Estrutura mínima (F4 do PLANNER)

Toda spec DEVE conter:

- **Goal** — 1 frase, outcome-oriented
- **Non-goals** — o que explicitamente NÃO faz parte
- **Constraints** — da constitution, perf, compat
- **Architecture** — fluxo de dados, componentes tocados
- **Files** — paths absolutos, create/modify/delete
- **Tasks** — TDD-shaped, 2-5min cada, checkbox list ordenado
- **Test plan** — cenários manuais + checks automáticos
- **Rollback** — como desfazer
- **Open questions** — pendências

## Lifecycle

1. Planner produz a spec na fase F4 e instrui o user a salvar aqui.
2. Planner gera o EXECUTOR PROMPT (F5) referenciando o caminho absoluto da spec.
3. Executor implementa.
4. Planner valida na fase F6 e marca PASS/FAIL no final da spec.

Specs são append-only após PASS — viram histórico de decisões. Para mudanças em features já especificadas, escreva uma nova spec referenciando a anterior.
