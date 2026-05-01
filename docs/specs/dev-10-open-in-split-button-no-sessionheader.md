# Open In split button no SessionHeader — spec

> Issue: DEV-10

## Goal

Substituir o action button morto do `SessionHeader` por um split button "Open in": clique direto abre o último editor usado; chevron ao lado abre dropdown com os demais (Zed, Cursor, VS Code, Fork, Custom). Selecionar no dropdown executa **e** atualiza o "último".

## Non-goals

- Não migrar Rename / Edit description / Stop / Delete pro header (seguem só no botão direito do sidebar).
- Não adicionar Open Terminal / Open Chat / Search Files mencionados na issue origem.
- Não persistir o "último editor" por sessão nem por workspace — preferência global do usuário.
- Não tocar em `SessionContextMenu` / `OpenInSubmenu` do sidebar.

## Constraints

- **Locked files** (CLAUDE.md): nada toca `pty-manager.ts`, `pty-registry.ts`, `session-manager.ts`, `db/migrations.ts`.
- macOS only. TS strict, no `any`, named exports, single quotes, no semis, printWidth 100.
- ESLint policy: nada de `disable-line` — refatorar quando brigar.
- Adicionar 1 dep nova: `@radix-ui/react-dropdown-menu`.

## Architecture

```
SessionHeader
├── (left) breadcrumb + cwd               (sem mudança)
└── (right) BranchSwitcher · ConfigBadge
    └── OpenInSplitButton                 ← novo (substitui IconButton "More options")
        ├── PrimaryButton (clique direto) → openInEditor(lastEditor)
        ├── Divider vertical
        └── DropdownMenu (Radix)
            ├── trigger: ChevronDown
            └── content: Zed · Cursor · VS Code · Fork · [Custom]
```

### Estado e persistência

- Hook `useLastOpenInEditor()` em `src/renderer/src/hooks/useLastOpenInEditor.ts`.
- Storage: `localStorage['deck:lastOpenInEditor']`.
- Tipo: `EditorPreset` (já existe em `src/shared/ipc.ts`).
- Default: `'zed'` quando ausente ou inválido.
- SSR-safe (`typeof window`).
- Validação na leitura: valor fora do union → fallback `'zed'`.
- Fallback runtime: `lastEditor === 'custom'` mas `customEditorCommand` null/vazio → abre `'zed'` SEM alterar persistência.

### Disabled state

`!session.cwd || session.cwd.trim() === ''` → split + chevron disabled, tooltip "No working directory" (mesmo gate do `OpenInSubmenu.tsx:23`).

### Custom editor

Item "Custom" só aparece no dropdown quando `customEditorCommand` está definido.

### UI / styling

- Wrapper `inline-flex` com borda + divider vertical interno; height/typography alinhados com `ConfigBadge`.
- PrimaryButton: ícone do editor + label curta ("Zed" / "Cursor" / "VS Code" / "Fork" / "Custom"). Tooltip: `Open in <Editor>`.
- Chevron: `ChevronDown` (`lucide-react`).
- Dropdown content reusa classes/animações de `ContextMenu.tsx`.

### Nova primitiva UI

`src/renderer/src/components/ui/DropdownMenu.tsx` — wrapper de `@radix-ui/react-dropdown-menu` espelhando `ContextMenu.tsx`:
- Exports: `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuSeparator`.
- Estilo idêntico. Sem submenu.

## Files

### Modify
- `src/renderer/src/components/session/SessionHeader.tsx` — remover `IconButton "More options"` (linhas 81-91); inserir `<OpenInSplitButton session={session} customEditorCommand={...} />` à direita do `ConfigBadge`.
- `src/renderer/src/components/ui/index.ts` — re-exportar DropdownMenu e siblings.
- `package.json` — adicionar `@radix-ui/react-dropdown-menu`.
- `pnpm-lock.yaml` — gerado pelo `pnpm install`.

### Create
- `src/renderer/src/hooks/useLastOpenInEditor.ts`
- `src/renderer/src/components/ui/DropdownMenu.tsx`
- `src/renderer/src/components/session/OpenInSplitButton.tsx`

### Delete

Nenhum.

## Tasks

- [ ] **T1** — `pnpm add @radix-ui/react-dropdown-menu`.
- [ ] **T2** — Criar `useLastOpenInEditor.ts` (validação contra union `EditorPreset`, default `'zed'`, SSR-safe).
- [ ] **T3** — Criar `DropdownMenu.tsx` espelhando `ContextMenu.tsx` (Content + Item + Separator).
- [ ] **T4** — Re-export em `components/ui/index.ts`.
- [ ] **T5** — Criar `OpenInSplitButton.tsx`:
  - Props `{ session: Session; customEditorCommand: string | null }`.
  - Lê `lastEditor` via hook.
  - Wrapper com PrimaryButton + divider + DropdownTrigger (chevron).
  - PrimaryButton onClick → `openInEditor(lastEditor)` com fallback `'custom' && !customEditorCommand → 'zed'`.
  - Items do dropdown: Zed, Cursor, VS Code, Fork, Custom (condicional). onSelect → `openInEditor(editor)` + `setLastEditor(editor)`.
  - Disabled state quando `!session.cwd`.
  - Helper local `getEditorMeta(editor): { label, icon }`.
- [ ] **T6** — Editar `SessionHeader.tsx`:
  - Remover bloco `<IconButton label="More options">...</IconButton>` e import órfão se houver.
  - Buscar `customEditorCommand` da mesma fonte que o sidebar (provavelmente `useDeckStore` settings — confirmar lendo `Sidebar.tsx`/`SessionItem.tsx`).
  - Inserir `<OpenInSplitButton session={session} customEditorCommand={customEditorCommand} />` à direita do `ConfigBadge`.
- [ ] **T7** — `pnpm typecheck && pnpm lint && pnpm format`.
- [ ] **T8** — Smoke manual (Test plan).

## Test plan

### Manual

1. **Default state** — Fresh install / `localStorage` limpo. Header mostra "Zed" + chevron. Click direto → Zed abre no `cwd`.
2. **Trocar via dropdown** — Click chevron → seleciona Cursor → Cursor abre, label vira "Cursor", `localStorage = 'cursor'`. Reload mantém.
3. **Custom editor** — Sem `customEditorCommand`: item "Custom" oculto. Configurar custom → item aparece.
4. **Custom fallback** — `localStorage = 'custom'` sem `customEditorCommand`: PrimaryButton mostra "Zed", click abre Zed sem persistir.
5. **Disabled state** — Session sem `cwd`: split + chevron disabled, tooltip "No working directory".
6. **Sidebar parity** — Botão direito no `SessionItem` continua intacto; não afeta o "último" do header (independentes).
7. **Visual** — Split alinha com `BranchSwitcher` e `ConfigBadge`. Sem layout shift entre labels ("Zed" → "VS Code").
8. **Dead button gone** — Três pontinhos some.

### Automated

- `pnpm typecheck` passa.
- `pnpm lint` passa sem novos warnings.
- Sem novo smoke test (mudança puramente UI, sem main process).

## Rollback

1. `git revert <commit>`.
2. `pnpm install` (remove dep nova).
3. `localStorage['deck:lastOpenInEditor']` órfão é inofensivo.

## Open questions

**Decididas:**

1. Sidebar e header são preferências independentes — sidebar NÃO atualiza o "último" do header.
2. Label do PrimaryButton: só nome do editor; tooltip explica "Open in <Editor>".
3. Custom sem `customEditorCommand`: PrimaryButton mostra "Zed" (auto-cura ao primeiro clique manual).
