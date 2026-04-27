#!/bin/bash
# scripts/release-local.sh
# Uso: ./scripts/release-local.sh

set -e

echo "Building .dmg..."
pnpm build:mac

VERSION=$(node -p "require('./package.json').version")
DMG="dist/Deck-${VERSION}.dmg"

if [ ! -f "$DMG" ]; then
  echo "❌ Build failed: $DMG not found"
  exit 1
fi

echo "Closing Deck.app if running..."
osascript -e 'quit app "Deck"' 2>/dev/null || true
sleep 2

echo "Removing old /Applications/Deck.app..."
rm -rf /Applications/Deck.app

echo "Mounting $DMG..."
MOUNT=$(hdiutil attach "$DMG" | grep "/Volumes" | awk -F'\t' '{print $NF}')

echo "Copying to /Applications..."
cp -R "$MOUNT/Deck.app" /Applications/

echo "Unmounting..."
hdiutil detach "$MOUNT"

echo "Removing quarantine..."
xattr -dr com.apple.quarantine /Applications/Deck.app 2>/dev/null || true

echo "Launching Deck..."
open /Applications/Deck.app

echo "✅ Deck $VERSION installed and launched"
