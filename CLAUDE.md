# Deck

App desktop Electron para orquestrar múltiplas sessões de Claude Code.
Primeiro app desktop — foco em aprender devagar, não pular etapas.

## Stack
Electron + electron-vite + React 18 + TypeScript + Tailwind + shadcn/ui
+ xterm.js + node-pty + better-sqlite3 + Zustand.

## Princípios (ver docs/deck-constitution.md pra detalhes)
- TypeScript end-to-end, zero Rust
- Construir em camadas, cada uma entrega valor sozinha
- Fase 1 = 1 terminal funcional; NÃO adicionar features de fases futuras
- UX importa desde o MVP

## Ordem atual
Semana 1: Bootstrap + terminal de bash
Semana 2: Claude Code dentro do terminal
Semana 3: Polish

Estou na Semana 1, Task 1.
