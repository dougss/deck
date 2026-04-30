# Execution Rules — Embedded Terminal Panel

> Lido pelo executor (Claw Engine bot). Spec canônica:
> `docs/deck-specs/2026-04-30-embedded-terminal-panel.md`

## Regras

1. NÃO desviar da spec. Se a realidade contradisser a spec (ex: arquivo não existe onde esperado, IPC já tem outro shape), PARE e reporte ao Douglas antes de improvisar.
2. NÃO tocar arquivos locked do `CLAUDE.md`: `pty-manager.ts`, `pty-registry.ts`, `session-manager.ts`, `db/migrations.ts`.
3. Implementar tasks **T1→T12** em ordem. Após cada task: `pnpm typecheck` (web + node) verde antes de seguir.
4. Stop-points para review do Douglas:
   - Após **T3** (IPC + menu prontos): validar que Ctrl+` chega no renderer.
   - Após **T6** (EmbeddedTerminal isolado): componente funcionando standalone.
   - Após **T9** (TerminalHost integrado): primeira validação visual do split.
   - Após **T12** (final): rodar suite completa de validação manual.
5. Convenções: TS strict, named exports, single quotes, no semis, printWidth 100, sem `any`.
6. Sem testes automatizados novos (Deck não tem suite unit/integration pro renderer; manual é o canônico).

## Validação final

```bash
pnpm typecheck && pnpm lint
pnpm db:smoke && pnpm session:smoke
```

Depois `pnpm dev` e validar manualmente os 10 cenários do "Test plan" da spec.

## Reporte

- Lista de tasks concluídas.
- Diff resumido (arquivos tocados).
- Resultados dos cenários manuais (golden path passou? edge case X?).
- Qualquer desvio da spec + justificativa.

## Git

Commit author: identidade do Claw Engine bot (não a do Douglas).
