# Deck — Instalação

## Build

```bash
pnpm build:mac
```

Gera em `dist/`:

- `Deck-0.3.0-beta.1.dmg` — instalador
- `Deck-0.3.0-beta.1-mac.zip` — zip portátil

Para testar sem empacotar (`.app` em `dist/mac-unpacked/`):

```bash
pnpm build:mac:dir
```

## Instalação

1. Abre `dist/Deck-*.dmg`
2. Arrasta `Deck.app` pra `/Applications`
3. Ejecta o volume

## Primeira abertura (unsigned build)

macOS bloqueia apps sem assinatura Apple. Workarounds:

**Opção A — GUI:**

- Botão direito em `Deck.app` → Open → Open (no dialog de aviso)

**Opção B — System Settings:**

- Tenta abrir normalmente (vai bloquear)
- System Settings → Privacy & Security → rola até ver "Deck was blocked" → Open Anyway

**Opção C — Terminal (mais rápido):**

```bash
xattr -d com.apple.quarantine /Applications/Deck.app
```

Após isso abre normalmente sem bloqueio.

## Atualizações

Sem auto-update. Para nova versão:

1. Fecha o Deck atual
2. Roda `pnpm build:mac` no repositório
3. Instala novo `.dmg` por cima (substitui `/Applications/Deck.app`)
4. DB e settings em `~/Library/Application Support/Deck/` são preservados

## Dados do app

- **DB:** `~/Library/Application Support/Deck/deck.db`
- **Settings:** `~/Library/Application Support/Deck/settings.json`
- **Logs:** `~/Library/Logs/Deck/`
