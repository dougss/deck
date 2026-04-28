# Spec — Fase 1: Terminal Embutido Funcional

> Primeira feature do Deck. Escopo mínimo que prova viabilidade técnica do projeto.
> Duração estimada: 2-3 semanas (10-20h/semana).

---

## User story (single)

> Como desenvolvedor, quero abrir o app Deck e ter UM terminal embutido que roda Claude Code
> exatamente como eu rodo no iTerm hoje — digito prompts, vejo respostas, aprovo tool uses,
> com cores e layout corretos — pra eu validar que a base técnica funciona antes de adicionar
> múltiplas sessões e features avançadas.

**Critério de "pronto":** Eu consigo usar o Deck no lugar do iTerm por 1 dia inteiro de trabalho
num projeto, sem precisar abrir terminal externo nenhuma vez.

---

## Escopo desta fase

### IN

- App Electron que abre uma janela única em macOS
- UI mínima: janela com um único terminal ocupando toda a área
- Terminal embutido via xterm.js + node-pty
- Ao abrir o app, um processo `claude` é spawnado no PTY automaticamente
- Input do usuário flui para o PTY
- Output do PTY é renderizado no xterm.js com cores ANSI corretas
- Redimensionar a janela redimensiona o PTY (SIGWINCH)
- Ctrl+C, Ctrl+D, Ctrl+L e outros controles funcionam como terminal nativo
- Ao fechar a janela, o processo `claude` é encerrado limpamente
- Tema escuro básico (fundo escuro, texto claro, cores ANSI bonitas)
- Fonte monoespaçada decente (JetBrains Mono, Fira Code ou SF Mono)

### OUT (fica pra fases seguintes)

- Múltiplas sessões / múltiplos terminais
- Sidebar / navegação entre sessões
- Persistência de sessões entre reinícios do app
- Hooks do Claude Code / observabilidade de estado
- Temas customizáveis
- Command palette
- Atalhos globais
- Instalador .dmg / code signing
- Windows / Linux support
- Qualquer integração com Claw Engine ou OpenClaw

---

## Arquitetura

### Processos

```
┌─────────────────────────────────┐
│  Main Process (Node)            │
│  - node-pty                     │
│  - spawn `claude`               │
│  - IPC channels                 │
└──────────┬──────────────────────┘
           │ IPC (contextBridge)
┌──────────▼──────────────────────┐
│  Renderer Process (React)       │
│  - xterm.js                     │
│  - UI (janela + terminal div)   │
└─────────────────────────────────┘
```

### IPC channels (preload script)

- `pty:spawn` (renderer → main) → main cria PTY, retorna pty ID
- `pty:input` (renderer → main) → bytes do teclado pro PTY
- `pty:output` (main → renderer) → bytes do PTY pro xterm
- `pty:resize` (renderer → main) → novo {cols, rows} quando janela resize
- `pty:exit` (main → renderer) → processo morreu (código de saída)

### Estrutura de pastas

```
deck/
├── electron.vite.config.ts
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── src/
│   ├── main/
│   │   ├── index.ts              # entrypoint do main process
│   │   ├── pty-manager.ts        # wrapper node-pty
│   │   └── ipc-handlers.ts       # handlers dos IPC channels
│   ├── preload/
│   │   └── index.ts              # contextBridge API
│   └── renderer/
│       ├── index.html
│       ├── src/
│       │   ├── main.tsx          # React entry
│       │   ├── App.tsx           # root component
│       │   ├── components/
│       │   │   └── Terminal.tsx  # xterm wrapper
│       │   ├── hooks/
│       │   │   └── useTerminal.ts
│       │   ├── styles/
│       │   │   └── globals.css
│       │   └── types/
│       │       └── ipc.ts        # tipos compartilhados com preload
```

---

## Requisitos técnicos detalhados

### R1. Bootstrap Electron

- `electron-vite` como build tool
- Template `react-ts` como base
- Hot reload no renderer funcional
- Main process com logs visíveis no terminal de dev
- macOS only: `electron-builder` não configurado ainda, só `npm run dev`

### R2. PTY funcional

- `node-pty@^1.0.0` instalado via `pnpm`
- Spawn de `claude` com:
  - `cwd` = argumento via flag (padrão: `~`)
  - `env` = herda do processo pai (crucial pra PATH, HOME, etc.)
  - `cols` / `rows` = tamanho calculado pelo xterm no mount
  - `name` = `xterm-256color`
- PTY é criado **após** o terminal React ter montado (pra ter cols/rows reais)

### R3. Integração xterm.js

- `@xterm/xterm@^5.5.0`
- Addons: `@xterm/addon-fit` (resize), `@xterm/addon-web-links` (links clicáveis)
- Fit addon roda no `useEffect` + `ResizeObserver` da janela
- Fonte: `SF Mono`, fallback `Menlo`, fallback `monospace`
- Tema:
  - `background: #0d0e12`
  - `foreground: #e5e5e5`
  - `cursor: #4a9eed`
  - `selection: rgba(74, 158, 237, 0.3)`
  - Paleta ANSI: usar palette "One Dark" ou similar (definida no código)

### R4. IPC seguro

- `contextIsolation: true` no BrowserWindow
- `nodeIntegration: false`
- Preload script expõe `window.deck = { pty: { spawn, input, resize, onOutput, onExit } }`
- Todas as chamadas são tipadas em TypeScript (shared types entre main/renderer)

### R5. Lifecycle

- App abre → janela cria → React monta → Terminal monta → PTY spawna → `claude` roda
- Usuário fecha janela → main mata PTY com SIGTERM → aguarda 2s → SIGKILL se ainda vivo
- Crash do PTY → erro mostrado como texto no terminal, não crasha o app

### R6. Estilo

- Tailwind configurado
- shadcn/ui instalado (mesmo que não use ainda; deixa pronto pra Fase 2)
- Janela tem padding zero (terminal ocupa 100%)
- Background da janela === background do terminal (sem "barra" visível)
- Tipografia consistente (UI em `Inter`, terminal em `SF Mono`)

---

## Checklist de tasks (ordem de execução)

### Semana 1 — Bootstrap + terminal de bash

- [ ] Inicializar projeto: `pnpm create @quick-start/electron deck --template react-ts`
- [ ] Configurar Tailwind + shadcn/ui seguindo docs oficiais
- [ ] Definir `electron.vite.config.ts` com aliases (`@/` → `src/renderer/src/`)
- [ ] Instalar `node-pty`, `@xterm/xterm`, `@xterm/addon-fit`, `@xterm/addon-web-links`
- [ ] Escrever `pty-manager.ts` com classe `PtyManager` (spawn, write, resize, kill)
- [ ] Configurar IPC handlers no main process
- [ ] Escrever preload script com contextBridge
- [ ] Componente `<Terminal />` React com xterm + fit addon
- [ ] Hook `useTerminal` lidando com ciclo de vida
- [ ] **Validação:** app abre com terminal rodando `zsh`, digito `ls` e funciona

### Semana 2 — Claude Code dentro do terminal

- [ ] Trocar spawn de `zsh` pra `claude`
- [ ] Ajustar env vars (verificar que `claude` acha o auth)
- [ ] Testar fluxo completo: abrir app → CC pergunta algo → respondo → CC usa tool → aprovo
- [ ] Corrigir bugs de escape sequences / cores (se houver)
- [ ] Corrigir resize (janela grande / pequena)
- [ ] **Validação:** uso o Deck por 2h num projeto real do Leve Saúde

### Semana 3 — Polish

- [ ] Dark theme bonito (não só funcional)
- [ ] Fonte com ligatures (SF Mono ou Fira Code)
- [ ] Título da janela mostra cwd
- [ ] Menu do app nativo macOS (Edit > Copy/Paste funcionando no terminal)
- [ ] Preferências persistidas em electron-store (fontSize, fontFamily, theme)
- [ ] Shortcut Cmd+K limpa terminal
- [ ] README com screenshot
- [ ] **Validação:** uso o Deck 1 dia inteiro sem abrir iTerm

---

## Riscos e mitigações

### R1: node-pty não compila em Electron

**Probabilidade:** Média
**Impacto:** Alto (bloqueia tudo)
**Mitigação:** Verificar versão compatível logo no dia 1. Se falhar, alternativa é `@lydell/node-pty` (fork ativo) ou conpty em último caso.

### R2: Autenticação do Claude Code dentro do PTY

**Probabilidade:** Baixa
**Impacto:** Alto
**Mitigação:** CC usa `~/.claude/.credentials.json` — se o env herda HOME corretamente, deve funcionar. Testar no dia 1 da Semana 2.

### R3: Escape sequences quebradas

**Probabilidade:** Média
**Impacto:** Médio
**Mitigação:** xterm.js suporta xterm-256color completo. Setar `TERM=xterm-256color` explicitamente no env do PTY.

### R4: Resize laggy

**Probabilidade:** Média
**Impacto:** Baixo
**Mitigação:** Debounce do resize em 100ms, usar `ResizeObserver` em vez de `window.resize`.

---

## Definição de "done" da Fase 1

A fase está completa quando **todos** os seguintes forem verdade:

1. `pnpm dev` abre o app com terminal rodando Claude Code
2. Eu consigo ter uma conversa completa com o CC dentro do Deck
3. Cores, negrito, cursor, seleção de texto funcionam
4. Redimensionar a janela funciona sem artefatos
5. Fechar a janela mata o processo limpo (não deixa zumbis)
6. O app tem visual decente (não parece um protótipo)
7. Eu usei o Deck 1 dia inteiro sem abrir iTerm

Quando esses 7 critérios forem verdade, **pare** e só comece a Fase 2 depois de usar o Deck por pelo menos 3 dias. Uso real revela o que a Fase 2 realmente precisa.

---

## Próximas fases (preview, não implementar agora)

- **Fase 2:** Múltiplas sessões (sidebar + tabs ou split)
- **Fase 3:** Observability via hooks (status em tempo real)
- **Fase 4:** Memória cross-session (opcional, só se dor real)
- **Fase 5:** Polish final (temas, atalhos, command palette, .dmg instalável)
