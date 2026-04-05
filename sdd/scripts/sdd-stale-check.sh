#!/usr/bin/env bash
# sdd-stale-check.sh — Detects SDD modules that may be outdated
# Compares last_updated in spec against last git commit touching module files.
# Usage: bash sdd/scripts/sdd-stale-check.sh [--days=30]
# Exit codes: 0 = all fresh, 1 = stale modules found

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SDD_ROOT="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$SDD_ROOT")"
INDEX_FILE="$SDD_ROOT/sdd_index.json"

DAYS="${1:-30}"
DAYS="${DAYS#--days=}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

STALE_COUNT=0

echo "═══════════════════════════════════════════"
echo " SDD Stale Check — Vision7"
echo " Threshold: ${DAYS} days"
echo "═══════════════════════════════════════════"
echo ""

cd "$PROJECT_ROOT"

# For each module, check if source files changed after spec's last_updated
python3 -c "
import json, subprocess, sys
from datetime import datetime, timedelta

threshold_days = int('$DAYS')
index = json.load(open('$INDEX_FILE'))

stale = []
for mod in index.get('modules', []):
    spec_path = mod['spec_file']
    try:
        spec = json.load(open(spec_path))
    except:
        continue

    last_updated = spec.get('last_updated', '')
    if not last_updated:
        stale.append((mod['name'], 'NO_DATE', 'No last_updated set'))
        continue

    try:
        spec_date = datetime.strptime(last_updated, '%Y-%m-%d')
    except:
        stale.append((mod['name'], last_updated, 'Invalid date format'))
        continue

    # Check source files for recent changes
    all_files = []
    files_section = spec.get('files', {})
    for category in files_section.values():
        if isinstance(category, list):
            all_files.extend(category)

    latest_commit = None
    for f in all_files:
        if f.endswith('/'):
            continue
        try:
            result = subprocess.run(
                ['git', 'log', '-1', '--format=%aI', '--', f],
                capture_output=True, text=True, timeout=5
            )
            if result.stdout.strip():
                commit_date = datetime.fromisoformat(result.stdout.strip().replace('Z', '+00:00')).replace(tzinfo=None)
                if latest_commit is None or commit_date > latest_commit:
                    latest_commit = commit_date
        except:
            pass

    if latest_commit and latest_commit > spec_date + timedelta(days=1):
        days_behind = (latest_commit - spec_date).days
        stale.append((mod['name'], last_updated, f'Source files changed {days_behind}d after spec update'))

    # Also check if spec itself is older than threshold
    now = datetime.now()
    age = (now - spec_date).days
    if age > threshold_days:
        stale.append((mod['name'], last_updated, f'Spec is {age} days old (threshold: {threshold_days}d)'))

for name, date, reason in stale:
    print(f'STALE|{name}|{date}|{reason}')

if not stale:
    print('ALL_FRESH')
" 2>/dev/null | while IFS='|' read -r status name date reason; do
  if [[ "$status" == "ALL_FRESH" ]]; then
    echo -e "${GREEN}✓ All SDD modules are up to date${NC}"
  elif [[ "$status" == "STALE" ]]; then
    echo -e "${YELLOW}⚠ ${name}${NC} (last: ${date}) — ${reason}"
    ((STALE_COUNT++)) || true
  fi
done

echo ""
if [[ "$STALE_COUNT" -gt 0 ]]; then
  echo -e "${YELLOW}Found ${STALE_COUNT} stale module(s). Run sdd-sync.sh to update.${NC}"
  exit 1
fi

echo -e "${GREEN}SDD stale check PASSED${NC}"
exit 0
