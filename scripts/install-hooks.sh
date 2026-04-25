#!/bin/bash
# Deck — Claude Code hook installer
# Installs Stop/Notification/StopFailure hooks into CC settings.json instances.
# Usage: install-hooks.sh [--uninstall] [instance-path ...]
# If no instance paths given, auto-discovers ~/.claude and ~/.claude-*.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DECK_DIR="$HOME/.deck"
HOOK_HANDLER_DEST="$DECK_DIR/hook-handler.sh"
HOOK_HANDLER_TEMPLATE="$SCRIPT_DIR/hook-handler.sh.template"
MARKER="deck/hook-handler"
HOOK_EVENTS='["Stop","Notification","StopFailure"]'
UNINSTALL=false

# Parse args
INSTANCES=()
for arg in "$@"; do
  case "$arg" in
    --uninstall) UNINSTALL=true ;;
    *) INSTANCES+=("$arg") ;;
  esac
done

# ── jq check (informational only) ──────────────────────────────────────────
if command -v jq >/dev/null 2>&1; then
  JQ_AVAILABLE=true
else
  JQ_AVAILABLE=false
  echo "ℹ  jq not found — hooks will use Python3 fallback (brew install jq for faster parsing)"
fi

# ── Ensure ~/.deck/ exists and handler is installed ────────────────────────
ensure_deck_dir() {
  mkdir -p "$DECK_DIR"
  if [ ! -f "$HOOK_HANDLER_TEMPLATE" ]; then
    echo "✗ hook-handler.sh.template not found at: $HOOK_HANDLER_TEMPLATE"
    exit 1
  fi
  cp "$HOOK_HANDLER_TEMPLATE" "$HOOK_HANDLER_DEST"
  chmod +x "$HOOK_HANDLER_DEST"
}

# ── Auto-discover CC instances ─────────────────────────────────────────────
discover_instances() {
  local found=()
  [ -d "$HOME/.claude" ] && found+=("$HOME/.claude")
  for dir in "$HOME"/.claude-*; do
    [ -d "$dir" ] && found+=("$dir")
  done
  echo "${found[@]+"${found[@]}"}"
}

# ── Check install status for one instance ─────────────────────────────────
check_status() {
  local settings="$1/settings.json"
  [ -f "$settings" ] || { echo "not-found"; return; }

  local count=0
  for event in Stop Notification StopFailure; do
    if python3 -c "
import json, sys
try:
    s = json.load(open('$settings'))
    hooks = s.get('hooks', {}).get('$event', [])
    for g in hooks:
        for h in g.get('hooks', []):
            if '$MARKER' in h.get('command', ''):
                sys.exit(0)
    sys.exit(1)
except Exception:
    sys.exit(1)
" 2>/dev/null; then
      count=$((count + 1))
    fi
  done

  case $count in
    0) echo "not-installed" ;;
    3) echo "installed" ;;
    *) echo "partial ($count/3)" ;;
  esac
}

# ── Merge hooks into settings.json ─────────────────────────────────────────
install_instance() {
  local dir="$1"
  local settings="$dir/settings.json"

  # Create settings.json if missing
  [ -f "$settings" ] || echo '{}' > "$settings"

  local status
  status=$(check_status "$dir")
  if [ "$status" = "installed" ]; then
    echo "✓ Already installed: $dir"
    return
  fi

  # Backup
  local backup="$settings.bak.$(date +%s)"
  cp "$settings" "$backup"
  echo "  Backup: $backup"

  # Merge using Python3 (always available)
  python3 - "$settings" "$HOOK_HANDLER_DEST" "$MARKER" <<'EOF'
import json, sys, os, tempfile

settings_path, handler_path, marker = sys.argv[1], sys.argv[2], sys.argv[3]
events = ["Stop", "Notification", "StopFailure"]

with open(settings_path) as f:
    data = json.load(f)

if "hooks" not in data or not isinstance(data["hooks"], dict):
    data["hooks"] = {}

for event in events:
    entries = data["hooks"].get(event, [])
    # Check if already installed
    already = False
    for g in entries:
        for h in g.get("hooks", []):
            if marker in h.get("command", ""):
                already = True
                break
        if already:
            break
    if already:
        continue
    # Append new hook group
    entries.append({"hooks": [{"type": "command", "command": handler_path}]})
    data["hooks"][event] = entries

# Atomic write
tmp = settings_path + ".tmp"
with open(tmp, "w") as f:
    json.dump(data, f, indent=2)
    f.write("\n")
os.replace(tmp, settings_path)
print("ok")
EOF

  echo "✓ Installed: $dir"
}

# ── Remove hooks from settings.json ────────────────────────────────────────
uninstall_instance() {
  local dir="$1"
  local settings="$dir/settings.json"
  [ -f "$settings" ] || { echo "- Skipped (no settings.json): $dir"; return; }

  local status
  status=$(check_status "$dir")
  if [ "$status" = "not-installed" ]; then
    echo "✓ Already clean: $dir"
    return
  fi

  local backup="$settings.bak.$(date +%s)"
  cp "$settings" "$backup"
  echo "  Backup: $backup"

  python3 - "$settings" "$MARKER" <<'EOF'
import json, sys, os

settings_path, marker = sys.argv[1], sys.argv[2]
events = ["Stop", "Notification", "StopFailure"]

with open(settings_path) as f:
    data = json.load(f)

hooks = data.get("hooks", {})
for event in events:
    entries = hooks.get(event, [])
    cleaned = []
    for g in entries:
        filtered = [h for h in g.get("hooks", []) if marker not in h.get("command", "")]
        if filtered:
            cleaned.append({**g, "hooks": filtered})
    if cleaned:
        hooks[event] = cleaned
    elif event in hooks:
        del hooks[event]

if hooks:
    data["hooks"] = hooks
elif "hooks" in data:
    del data["hooks"]

tmp = settings_path + ".tmp"
with open(tmp, "w") as f:
    json.dump(data, f, indent=2)
    f.write("\n")
os.replace(tmp, settings_path)
print("ok")
EOF

  echo "✓ Uninstalled: $dir"
}

# ── Main ───────────────────────────────────────────────────────────────────
if [ "${#INSTANCES[@]}" -eq 0 ]; then
  read -ra INSTANCES <<< "$(discover_instances)"
fi

if [ "${#INSTANCES[@]}" -eq 0 ]; then
  echo "No Claude Code instances found (expected ~/.claude or ~/.claude-*)."
  exit 0
fi

if [ "$UNINSTALL" = false ]; then
  ensure_deck_dir
fi

for instance in "${INSTANCES[@]}"; do
  if [ "$UNINSTALL" = true ]; then
    uninstall_instance "$instance"
  else
    install_instance "$instance"
  fi
done

echo "Done."
