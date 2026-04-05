#!/usr/bin/env bash
# sdd-version.sh — Version management for SDD modules
# Usage:
#   bash sdd/scripts/sdd-version.sh list              — List all modules with versions
#   bash sdd/scripts/sdd-version.sh bump <module-id>   — Bump patch version
#   bash sdd/scripts/sdd-version.sh bump <module-id> minor — Bump minor version
#   bash sdd/scripts/sdd-version.sh bump <module-id> major — Bump major version
#   bash sdd/scripts/sdd-version.sh diff <module-id>   — Show changelog

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SDD_ROOT="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$SDD_ROOT")"
INDEX_FILE="$SDD_ROOT/sdd_index.json"

ACTION="${1:-list}"
MODULE_ID="${2:-}"
BUMP_TYPE="${3:-patch}"

cd "$PROJECT_ROOT"

case "$ACTION" in
  list)
    echo "═══════════════════════════════════════════"
    echo " SDD Module Versions — Vision7"
    echo "═══════════════════════════════════════════"
    echo ""
    printf "%-25s %-10s %-20s %s\n" "MODULE" "VERSION" "STATUS" "UPDATED"
    printf "%-25s %-10s %-20s %s\n" "───────────────────────" "────────" "──────────────────" "──────────"
    python3 -c "
import json
data = json.load(open('$INDEX_FILE'))
for m in data.get('modules', []):
    spec = json.load(open(m['spec_file']))
    print(f\"{spec['module'][:25]:<25} {spec['version']:<10} {spec['status']:<20} {spec.get('last_updated', 'N/A')}\")
"
    ;;

  bump)
    if [[ -z "$MODULE_ID" ]]; then
      echo "Usage: sdd-version.sh bump <module-id> [patch|minor|major]"
      exit 1
    fi
    python3 -c "
import json
from datetime import date

index = json.load(open('$INDEX_FILE'))
mod = next((m for m in index['modules'] if m['id'] == '$MODULE_ID'), None)
if not mod:
    print(f'Module not found: $MODULE_ID')
    exit(1)

spec = json.load(open(mod['spec_file']))
old = spec['version']
parts = old.split('.')
bump = '$BUMP_TYPE'

if bump == 'major':
    parts = [str(int(parts[0]) + 1), '0', '0']
elif bump == 'minor':
    parts = [parts[0], str(int(parts[1]) + 1), '0']
else:
    parts = [parts[0], parts[1], str(int(parts[2]) + 1)]

new_v = '.'.join(parts)
spec['version'] = new_v
spec['last_updated'] = date.today().isoformat()
mod['version'] = new_v

history = spec.get('change_history', [])
history.append({
    'date': date.today().isoformat(),
    'version': new_v,
    'author': 'sdd-version',
    'description': f'{bump.capitalize()} version bump: {old} → {new_v}'
})
spec['change_history'] = history

with open(mod['spec_file'], 'w') as f:
    json.dump(spec, f, indent=2, ensure_ascii=False)
    f.write('\n')

with open('$INDEX_FILE', 'w') as f:
    json.dump(index, f, indent=2, ensure_ascii=False)
    f.write('\n')

print(f'✓ {spec[\"module\"]}: {old} → {new_v} ({bump})')
"
    ;;

  diff)
    if [[ -z "$MODULE_ID" ]]; then
      echo "Usage: sdd-version.sh diff <module-id>"
      exit 1
    fi
    python3 -c "
import json
index = json.load(open('$INDEX_FILE'))
mod = next((m for m in index['modules'] if m['id'] == '$MODULE_ID'), None)
if not mod:
    print(f'Module not found: $MODULE_ID')
    exit(1)

spec = json.load(open(mod['spec_file']))
print(f\"Changelog: {spec['module']} (current: {spec['version']})\")
print('─' * 60)
for entry in reversed(spec.get('change_history', [])):
    print(f\"{entry.get('date', '?')}  v{entry.get('version', '?')}  [{entry.get('author', '?')}]\")
    print(f\"  {entry.get('description', '')}\")
    print()
"
    ;;

  *)
    echo "Usage: sdd-version.sh <list|bump|diff> [module-id] [patch|minor|major]"
    exit 1
    ;;
esac
