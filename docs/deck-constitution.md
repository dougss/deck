# Deck — Constitution

> Cockpit desktop para orquestrar múltiplas sessões de Claude Code paralelas.
> Self-hosted desktop app, TypeScript end-to-end.

> **Para o PLANNER:** as seções **Princípios**, **Não-objetivos** e **Stack decidida** abaixo são **imutáveis**. Qualquer plano que as contrarie deve ser sinalizado e barrado antes de chegar à F3 APPROVE. Mudanças nesses rails exigem uma spec dedicada de revisão da constitution.

---

## Por que existe

O problema real: rodar 3-5 sessões de Claude Code em paralelo (múltiplos projetos em paralelo) via terminal + tmux é ineficiente. Não há visibilidade de estado entre sessões, tenho que alternar janelas pra saber qual agent precisa de input, e a UX de cada terminal é a UX padrão que já não me agrada.

**Deck não é um terminal melhor. É um cockpit onde eu vejo e opero todos os agents num lugar só.**

Alternativas consideradas e por que não servem:

- **Subspace** — Mac M-series only; meu Hackintosh Intel não roda
- **Cursor/Zed** — IDEs com agent, não orquestradores multi-sessão
- **Claw Engine (meu próprio)** — orquestra, mas não tem interface visual
- **Warp, Ghostty, iTerm** — terminais, não cockpits

---

## Princípios

### 1. Terminal embutido é feature, não decoração

O coração do app é o terminal. Ele tem que funcionar _perfeitamente_ — cores, escape sequences, redimensionamento, input encoding, ctrl+c, tudo. Se o terminal for frágil, o resto é inútil.

### 2. Construir em camadas; cada camada entrega valor sozinha

Ordem: (1) terminal embutido funcional → (2) múltiplas sessões → (3) observability/status → (4) memória cross-session.
Se o projeto morrer em qualquer fase, o que foi construído até ali é utilizável.

### 3. TypeScript end-to-end; zero Rust

Stack conhecido. Curva de aprendizado vai pro domínio do problema (Electron, PTY, xterm.js), não pra linguagem nova.

### 4. UX > features

Primeiro app desktop. Vale mais ter 3 features polidas do que 20 rotas não terminadas. Inspiração visual: Zed, Cursor, Linear.

### 5. Self-hosted, sem backend cloud

Roda 100% local. SQLite local, processos filhos locais, zero dependência de serviço externo. Nada de login, nada de API remota.

### 6. Não reinventar o ecossistema do Claude Code

Usar hooks oficiais (`SessionStart`, `PostToolUse`, etc.). Não interceptar stdout via parsing frágil. Se o CC não expuser algo via API oficial, aceitar que Deck não tem esse dado.

### 7. Prazer de uso é parte do requisito

Não vou construir algo feio "só porque funciona". Tipografia, espaçamento, animações sutis, temas — isso importa porque eu vou usar todo dia.

### 8. Integrar com o que já existe, não substituir

- **Claw Engine** continua existindo pra orquestração programática (spawn via script)
- **OpenClaw** continua sendo pro canal Telegram
- **Deck** é o cockpit visual pra dev flow diário

### 9. Trabalhar com meu contexto real

Múltiplos contextos mentais distintos (work projects, personal). A UI tem que deixar isso claro em 0.5s de olhar. Cor, agrupamento, separação visual.

---

## Não-objetivos (escopo que NÃO faz parte)

- Não é IDE (sem editor de código integrado)
- Não é browser (sem painel de navegação web no MVP; pode vir depois, talvez)
- Não é pra outros usuários (projeto pessoal; multiuser nunca)
- Não roda no Windows/Linux no MVP (só macOS — é onde eu trabalho)
- Não tenta substituir tmux pra uso fora de agents (só pra sessões de CC)
- Não tenta ser "agent runtime agnostic" no MVP (foca só em Claude Code; Codex/Gemini depois se fizer sentido)

---

## Stack decidida

### Core

- **Electron** (primeiro app desktop, stack conhecido, node-pty funciona nativo)
- **electron-vite** (template moderno, HMR decente)
- **TypeScript** estrito

### Frontend

- **React 18**
- **Vite** (via electron-vite)
- **Tailwind CSS**
- **shadcn/ui** (componentes base)
- **@xterm/xterm** + addons (`@xterm/addon-fit`, `@xterm/addon-web-links`)
- **Zustand** (estado)

### Backend (main process)

- **node-pty** (PTY real, spawn de processos interativos)
- **better-sqlite3** (persistência local síncrona)
- **electron-store** (configs simples)

### Build / Dev

- **pnpm** (gerenciador de pacotes)
- **electron-builder** (empacotamento .app)
- **ESLint + Prettier** (padrão da casa)

---

## Decisões arquiteturais

### Processo Electron

- **Main process** — gerencia PTYs, spawn de Claude Code, SQLite, hooks
- **Renderer process** — React UI, xterm.js instances
- **Preload script** — bridge segura (contextBridge) expondo APIs tipadas

### Modelo de sessão

- Uma "sessão Deck" = um processo `claude` rodando num PTY dedicado
- Cada sessão tem: id, workspace/repo path, worktree (opcional), status, PTY handle, xterm instance
- Sessões são persistidas; ao reabrir o app, sessões marcadas como "keep alive" reabrem

### Hooks do Claude Code

- Deck instala um hook global em `~/.claude/settings.json` ao rodar primeira vez
- Hook envia evento via IPC (socket Unix local) pro processo Deck
- Deck pode estar aberto ou fechado; eventos são sempre persistidos em SQLite

### UI structure

- Sidebar esquerda: lista de sessões agrupadas por workspace
- Área central: terminal da sessão ativa (ocupa maior parte)
- Sidebar direita opcional: detalhes da sessão (último tool use, custo de tokens, etc.)
- Command palette (Cmd+K): dispatcher rápido pra ações comuns

---

## Métricas de sucesso

O projeto é bem sucedido se, no mês 3 após o start:

1. Eu uso o Deck como interface padrão pro Claude Code todo dia
2. Eu rodo 5+ sessões paralelas sem confusão mental
3. Eu não sinto falta de abrir terminal/tmux pra operar agents
4. Eu tenho prazer em abrir o app (não é só tolerável, é bom)

Se qualquer uma dessas 4 não acontecer no mês 3, o projeto precisa de revisão séria ou descontinuação.

---

## Riscos conhecidos

### Alto

- **node-pty + Electron** tem histórico de dor em upgrades (ABI mismatch). Mitigação: travar versões, atualizar com cuidado.
- **Primeiro app desktop da vida.** Mitigação: começar minimalista (1 terminal), não 5.

### Médio

- **Hooks do CC podem mudar schema.** Mitigação: versionar nossa camada de parsing, tolerar campos desconhecidos.
- **Consumo de RAM do Electron.** Mitigação: aceitar (preço do conforto); otimizar só se virar problema real.

### Baixo

- **xterm.js é maduro**, baixo risco
- **SQLite local** zero risco
- **shadcn/ui** zero risco

---

## Convenções

- **Branch naming:** `feat/`, `fix/`, `chore/`, `refactor/`
- **Commits:** Conventional Commits
- **Specs:** padrão `/speckit.specify` (mesmo fluxo do Leve Saúde)
- **Documentação:** README + specs em `/specs`, decisões em `/docs/adr`
- **Testes:** Vitest pra lógica pura; Playwright pra E2E (depois da Fase 2)
