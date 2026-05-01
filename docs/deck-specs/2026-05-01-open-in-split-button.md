---

Open In split button no SessionHeader — spec

▎ Issue: [https://github.com/dougss/deck/issues/4](https://github.com/dougss/deck/issues/4) · Recorte mínimo (só "Open in")

Goal

Substituir o action button morto do SessionHeader por um split button "Open in" com clique direto no último
editor usado + chevron que abre dropdown com os demais. Selecionar no dropdown executa e atualiza o "último".

Non-goals

- Não migrar Rename / Edit description / Stop / Delete pro header (seguem só no botão direito do sidebar).
- Não adicionar Open Terminal / Open Chat / Search Files mencionados na issue (não existem hoje, tratar em
specs futuras).
- Não persistir o "último editor" por sessão nem por workspace — preferência global do usuário.
- Não tocar em SessionContextMenu / OpenInSubmenu do sidebar (continuam como estão).

Constraints

- Locked files (CLAUDE.md): nada toca pty-manager.ts, pty-registry.ts, session-manager.ts, db/migrations.ts.
Spec respeita.
- macOS only. TS strict, no any, named exports, single quotes, no semis, printWidth 100.
- ESLint policy: nada de disable-line; se algo brigar, refatora.
- Adicionar 1 dep nova: @radix-ui/react-dropdown-menu (mesma família dos Radix já instalados).

Architecture

Componentes

SessionHeader
├── (left) breadcrumb + cwd               (sem mudança)
└── (right) BranchSwitcher · ConfigBadge
    └── OpenInSplitButton                 ← novo (substitui IconButton "More options")
        ├── PrimaryButton (clique direto) → openInEditor(lastEditor)
        ├── Divider vertical
        └── DropdownMenu (Radix)
            └── trigger: ChevronDown
            └── content: Zed · Cursor · VS Code · Fork · [Custom]

Estado e persistência

- Hook: useLastOpenInEditor() em src/renderer/src/hooks/useLastOpenInEditor.ts.
- Storage: localStorage['deck:lastOpenInEditor'].
- Tipo: EditorPreset (já existe em src/shared/ipc.ts).
- Default: 'zed' quando não há valor salvo ou valor inválido.
- Validação na leitura: se o valor não está no union 'zed' | 'cursor' | 'vscode' | 'fork' | 'custom', fallback
para 'zed'.
- Fallback runtime: se lastEditor === 'custom' mas customEditorCommand é null/vazio, abrir como 'zed' sem
alterar o "último" persistido (evita gravar fallback transitório).

Disabled state

Mesmo gate do OpenInSubmenu.tsx:23: split button (e dropdown) ficam disabled quando !session.cwd ||
session.cwd.trim() === ''. Tooltip: "No working directory".

Custom editor

Item "Custom" só aparece no dropdown quando customEditorCommand está definido (mesma regra do
OpenInSubmenu.tsx).

UI / styling

- Wrapper do split: inline-flex com borda, divider vertical interno, mesmo height/typography que ConfigBadge
pra alinhar visualmente no header.
- PrimaryButton mostra: ícone do editor (lucide ou inline SVG) + label curta ("Zed", "Cursor", "VS Code",
"Fork", "Custom"). Tooltip: "Open in <Editor>".
- Chevron usa ChevronDown do lucide-react (já em uso no projeto).
- Dropdown content reusa as classes/animações de ContextMenu.tsx para consistência visual.

Nova primitiva UI

src/renderer/src/components/ui/DropdownMenu.tsx — wrapper de @radix-ui/react-dropdown-menu espelhando
ContextMenu.tsx:

- Exports: DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator.
- Estilo idêntico ao ContextMenu (mesmas classes Tailwind no Content e no Item).
- Sem submenu (não precisa pra esse caso).

Files

Create

- src/renderer/src/hooks/useLastOpenInEditor.ts — hook [lastEditor, setLastEditor] com localStorage.
- src/renderer/src/components/ui/DropdownMenu.tsx — primitiva Radix.
- src/renderer/src/components/session/OpenInSplitButton.tsx — split button completo.

Modify

- src/renderer/src/components/session/SessionHeader.tsx — remover IconButton "More options" (linhas 81-91);
inserir <OpenInSplitButton session={session} customEditorCommand={...} /> no cluster da direita.
- src/renderer/src/components/ui/index.ts — re-exportar DropdownMenu e siblings.
- package.json — adicionar @radix-ui/react-dropdown-menu.
- pnpm-lock.yaml — gerado pelo pnpm install.

Delete

- Nenhum.

Tasks

- T1 — Adicionar dep @radix-ui/react-dropdown-menu (pnpm add @radix-ui/react-dropdown-menu).
- T2 — Criar useLastOpenInEditor.ts com leitura/gravação em localStorage['deck:lastOpenInEditor'], validação
contra union EditorPreset, default 'zed'. Cobrir: leitura em SSR-safe (typeof window), valor inválido →
default, setLastEditor persiste.
- T3 — Criar DropdownMenu.tsx espelhando ContextMenu.tsx (Content + Item + Separator). Sem submenu.
- T4 — Re-export em components/ui/index.ts.
- T5 — Criar OpenInSplitButton.tsx:
  - Props { session: Session; customEditorCommand: string | null }.
  - Lê lastEditor via hook.
  - Renderiza wrapper com PrimaryButton + divider + DropdownTrigger (chevron).
  - PrimaryButton onClick → openInEditor(lastEditor) com fallback 'custom' && !customEditorCommand → 'zed'.
  - Items do dropdown: Zed, Cursor, VS Code, Fork, Custom (condicional). onSelect → openInEditor(editor) +
setLastEditor(editor).
  - Disabled state quando !session.cwd.
  - Helper local getEditorMeta(editor): { label, icon } pra label/ícone.
- T6 — Editar SessionHeader.tsx:
  - Remover bloco <IconButton label="More options"> ... </IconButton> e o import órfão se houver.
  - Buscar customEditorCommand da mesma fonte que o sidebar (provavelmente useDeckStore settings — confirmar
lendo Sidebar.tsx / SessionItem.tsx durante execução).
  - Inserir <OpenInSplitButton session={session} customEditorCommand={customEditorCommand} /> à direita do
ConfigBadge.
- T7 — Rodar pnpm typecheck && pnpm lint && pnpm format.
- T8 — Smoke manual (ver Test plan).

Test plan

Manual

1. Default state — Fresh install / localStorage limpo. Abrir uma session com cwd válido. Header mostra "Open in
 Zed" no PrimaryButton + chevron. Clicar no PrimaryButton → Zed abre no cwd.
localStorage['deck:lastOpenInEditor'] permanece 'zed' (ou ausente).
2. Trocar via dropdown — Clicar no chevron → dropdown lista Zed/Cursor/VS Code/Fork (+ Custom se configurado).
Selecionar Cursor → Cursor abre, label do PrimaryButton vira "Cursor", localStorage = 'cursor'. Recarregar app
→ continua "Cursor".
3. Custom editor — Sem customEditorCommand configurado: item "Custom" não aparece. Configurar custom em
settings → reabrir dropdown → "Custom" aparece. Selecionar → executa, vira "Custom".
4. Custom fallback — localStorage = 'custom' mas user removeu customEditorCommand. PrimaryButton mostra
"Custom" (ou "Zed"? — decidir na implementação: recomendado mostrar "Zed" e gravar quando o user clicar).
Clique direto → abre Zed sem persistir mudança.
5. Disabled state — Session shell sem cwd (ou cwd vazio). PrimaryButton + chevron disabled, opacity reduzida,
tooltip "No working directory".
6. Sidebar parity — Botão direito num SessionItem do sidebar continua mostrando o OpenInSubmenu intacto.
Selecionar lá NÃO afeta o "último" do header (decisão: header e sidebar são independentes — confirma).
7. Visual — Split button alinha verticalmente com BranchSwitcher e ConfigBadge no header. Sem clipping, sem
layout shift quando label muda de tamanho ("Zed" → "VS Code").
8. Dead button gone — O ícone de três pontinhos sumiu. Nenhum elemento sem ação visível no header.

Automatizado

- pnpm typecheck passa (web tsconfig).
- pnpm lint passa sem novos warnings.
- Sem novo smoke test (mudança puramente UI, sem main process).

Rollback

1. git revert <commit> da spec inteira.
2. pnpm install (remove dep nova).
3. localStorage['deck:lastOpenInEditor'] fica órfão no profile dos users — inofensivo, ignorado se a feature
voltar mais tarde.

Open questions

1. Sidebar afeta o "último" do header? Recomendação: não (mantêm preferências independentes — header é a fonte
do "último" rápido; sidebar é o menu completo). Mas é trivial unificar passando o setLastEditor pro
OpenInSubmenu se quiser. Decidir antes de executar.
2. Label do PrimaryButton: só nome do editor ("Zed") ou prefixo "Open in Zed"? Recomendação: só nome (mais
compacto), tooltip explica. Decidir antes de executar.
3. Custom com customEditorCommand ausente: PrimaryButton mostra "Zed" (fallback visual) ou "Custom"
desabilitado? Recomendação: mostrar "Zed" e gravar 'zed' no primeiro clique (auto-cura). Decidir antes de
executar.

---
PASS/FAIL: pendente — preencher após F6.