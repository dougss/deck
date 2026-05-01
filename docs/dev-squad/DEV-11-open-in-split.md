# DEV-11: Open In split button no SessionHeader

> Issue: DEV-11
> Mode: validate

## Summary

Substituir o action button morto ("More options") do `SessionHeader` por um split button "Open in" funcional: clique direto abre o último editor usado; chevron ao lado abre dropdown com os demais editores disponíveis (Zed, Cursor, VS Code, Fork, Custom). Selecionar no dropdown executa e atualiza o "último editor" na preferência global do usuário.

## User Stories

- **US-1** Como usuário do Deck, quero abrir a sessão atual no meu editor preferido com um clique direto, sem navegar por menus.
  - Acceptance: Clicar no botão principal do split button abre imediatamente o último editor usado no `cwd` da sessão.

- **US-2** Como usuário, quero trocar rapidamente entre editores disponíveis sem acessar configurações.
  - Acceptance: Clicar no chevron abre dropdown com todos os editores (Zed, Cursor, VS Code, Fork, Custom se configurado); selecionar um editor executa a abertura e atualiza a preferência global.

- **US-3** Como usuário sem working directory na sessão, não quero ver opções de abertura que falhariam.
  - Acceptance: Quando `session.cwd` está vazio, o split button fica disabled com tooltip "No working directory".

## Functional Requirements

- **FR-001** Sistema MUST armazenar a última escolha de editor em `localStorage['deck:lastOpenInEditor']` como preferência global.
- **FR-002** Sistema MUST validar o valor lido do localStorage contra o union `EditorPreset`; valores inválidos MUST usar fallback `'zed'`.
- **FR-003** Sistema MUST ser SSR-safe (verificar `typeof window` antes de acessar localStorage).
- **FR-004** Quando `lastEditor === 'custom'` mas `customEditorCommand` está null/vazio, clique no botão principal MUST abrir `'zed'` SEM alterar a persistência.
- **FR-005** Item "Custom" no dropdown MUST aparecer apenas quando `customEditorCommand` está definido.
- **FR-006** Split button (botão principal + chevron) MUST ficar disabled quando `!session.cwd || session.cwd.trim() === ''`.
- **FR-007** Selecionar um editor no dropdown MUST executar `openInEditor(editor)` E atualizar `localStorage['deck:lastOpenInEditor']` atomicamente.
- **FR-008** Botão principal MUST exibir ícone e label do último editor usado (ex: "Zed", "Cursor", "VS Code", "Fork", "Custom").
- **FR-009** Sidebar e header MUST ter preferências de editor independentes (botão direito no sidebar NÃO afeta o "último" do header).
- **FR-010** Sistema MUST remover o `IconButton "More options"` (três pontinhos) do `SessionHeader` existente.

## Non-Functional / Constraints

- **Locked files** (CLAUDE.md): `pty-manager.ts`, `pty-registry.ts`, `session-manager.ts`, `db/migrations.ts` — não tocar.
- **Stack constraints**: TypeScript strict mode, sem `any`, named exports, single quotes, sem semicolons, printWidth 100.
- **ESLint policy**: Sem `disable-line` — refatorar quando brigar.
- **Platform**: macOS only.
- **Dependencies**: Adicionar `@radix-ui/react-dropdown-menu` (única dep nova).
- **Performance**: Sem impacto — operação local (localStorage + IPC já existente).

## Out of Scope

- Migrar Rename / Edit description / Stop / Delete pro header (seguem só no botão direito do sidebar).
- Adicionar Open Terminal / Open Chat / Search Files mencionados na issue origem dougss/deck#4.
- Persistir o "último editor" por sessão ou por workspace (preferência global apenas).
- Modificar `SessionContextMenu` / `OpenInSubmenu` do sidebar.

## Files Affected

### Create

- `src/renderer/src/hooks/useLastOpenInEditor.ts` — Hook para ler/escrever `localStorage['deck:lastOpenInEditor']` com validação contra `EditorPreset` e SSR-safety.
- `src/renderer/src/components/ui/DropdownMenu.tsx` — Wrapper Radix `@radix-ui/react-dropdown-menu` espelhando `ContextMenu.tsx` (exports: DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator).
- `src/renderer/src/components/session/OpenInSplitButton.tsx` — Componente split button com PrimaryButton (último editor) + divider + DropdownTrigger (chevron).

### Modify

- `src/renderer/src/components/session/SessionHeader.tsx` — Remover `IconButton "More options"` (linhas 81-91 aproximadamente); inserir `<OpenInSplitButton session={session} customEditorCommand={...} />` à direita do `ConfigBadge`. Buscar `customEditorCommand` da mesma fonte do sidebar (provavelmente `useDeckStore` settings).
- `src/renderer/src/components/ui/index.ts` — Re-exportar DropdownMenu e componentes relacionados.
- `package.json` — Adicionar `@radix-ui/react-dropdown-menu`.
- `pnpm-lock.yaml` — Gerado automaticamente por `pnpm install`.

### Delete

- Nenhum.

## Test Plan

### Automated (Developer + QA run literally)

- `pnpm typecheck` → exit 0
- `pnpm lint` → exit 0, no new warnings
- `pnpm format` → exit 0 (ou auto-fix se houver)

### Manual (QA executes step-by-step)

1. **Default state** — Fresh install / `localStorage` limpo. Header mostra "Zed" + chevron. Clicar direto no "Zed" → Zed abre no `cwd` da sessão. `localStorage['deck:lastOpenInEditor']` = `'zed'`.
2. **Trocar via dropdown** — Clicar no chevron → selecionar "Cursor" → Cursor abre no `cwd`, label do botão principal muda para "Cursor", `localStorage` atualiza para `'cursor'`. Reload da janela mantém preferência.
3. **Custom editor (sem configuração)** — Sem `customEditorCommand` definido nas settings: item "Custom" NÃO aparece no dropdown.
4. **Custom editor (com configuração)** — Configurar `customEditorCommand` nas settings → item "Custom" aparece no dropdown. Selecionar "Custom" → custom command executa, label vira "Custom".
5. **Custom fallback** — Manualmente setar `localStorage['deck:lastOpenInEditor'] = 'custom'` + limpar `customEditorCommand` → reload → botão principal mostra "Zed", clicar abre Zed (sem alterar localStorage).
6. **Disabled state** — Sessão sem `cwd` (ou `cwd` vazio) → split button (botão principal + chevron) fica disabled (cinza), tooltip "No working directory".
7. **Sidebar independente** — Botão direito no `SessionItem` do sidebar → "Open in" continua funcionando independentemente; selecionar um editor no sidebar NÃO altera o "último" do header.
8. **Visual alignment** — Split button alinha verticalmente com `BranchSwitcher` e `ConfigBadge`. Trocar entre labels ("Zed" → "VS Code") NÃO causa layout shift.
9. **Dead button gone** — Três pontinhos ("More options") desaparecem do header.

## Open Questions

1. **Sidebar vs header independence** — Confirmado: sidebar e header mantêm preferências independentes. Sidebar NÃO atualiza o "último" do header.
2. **Label do PrimaryButton** — Confirmado: apenas nome do editor (ex: "Zed"); tooltip explica "Open in <Editor>".
3. **Custom sem `customEditorCommand`** — Confirmado: PrimaryButton mostra "Zed" (auto-cura ao primeiro clique manual no dropdown).

_Todas as open questions já foram decididas na spec original._
