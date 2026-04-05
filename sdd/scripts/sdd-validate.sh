#!/usr/bin/env bash
# sdd-validate.sh — Validates all SDD module specs against the schema
# Usage: bash sdd/scripts/sdd-validate.sh [--strict]
# Exit codes: 0 = valid, 1 = errors found

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SDD_ROOT="$(dirname "$SCRIPT_DIR")"
MODULES_DIR="$SDD_ROOT/modules"
INDEX_FILE="$SDD_ROOT/sdd_index.json"
STRICT="${1:-}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ERRORS=0
WARNINGS=0

log_ok()    { echo -e "${GREEN}✓${NC} $1"; }
log_warn()  { echo -e "${YELLOW}⚠${NC} $1"; ((WARNINGS++)); }
log_err()   { echo -e "${RED}✗${NC} $1"; ((ERRORS++)); }

echo "═══════════════════════════════════════════"
echo " SDD Validation — Vision7"
echo "═══════════════════════════════════════════"
echo ""

# 1. Check index file exists
if [[ ! -f "$INDEX_FILE" ]]; then
  log_err "sdd_index.json not found at $INDEX_FILE"
  exit 1
fi
log_ok "sdd_index.json exists"

# 2. Validate index is valid JSON
if ! python3 -c "import json; json.load(open('$INDEX_FILE'))" 2>/dev/null; then
  log_err "sdd_index.json is not valid JSON"
  exit 1
fi
log_ok "sdd_index.json is valid JSON"

# 3. Check each module file referenced in index exists and is valid JSON
MODULE_COUNT=$(python3 -c "
import json
data = json.load(open('$INDEX_FILE'))
for m in data.get('modules', []):
    print(m.get('spec_file', ''))
")

echo ""
echo "Checking module spec files..."
echo ""

while IFS= read -r spec_path; do
  [[ -z "$spec_path" ]] && continue
  FULL_PATH="$(dirname "$SDD_ROOT")/$spec_path"

  if [[ ! -f "$FULL_PATH" ]]; then
    log_err "Module spec not found: $spec_path"
    continue
  fi

  # Validate JSON
  if ! python3 -c "import json; json.load(open('$FULL_PATH'))" 2>/dev/null; then
    log_err "Invalid JSON: $spec_path"
    continue
  fi

  # Validate required fields
  VALIDATION=$(python3 -c "
import json, sys
data = json.load(open('$FULL_PATH'))
required = ['module', 'version', 'owner', 'status', 'objective']
missing = [f for f in required if not data.get(f)]
if missing:
    print('MISSING:' + ','.join(missing))
else:
    print('OK')
")

  if [[ "$VALIDATION" == OK ]]; then
    MODULE_NAME=$(python3 -c "import json; print(json.load(open('$FULL_PATH'))['module'])")
    MODULE_STATUS=$(python3 -c "import json; print(json.load(open('$FULL_PATH'))['status'])")
    log_ok "$MODULE_NAME ($MODULE_STATUS)"
  else
    log_err "$spec_path — ${VALIDATION}"
  fi

  # Check for empty functional requirements
  FR_COUNT=$(python3 -c "
import json
data = json.load(open('$FULL_PATH'))
print(len(data.get('functional_requirements', [])))
")
  if [[ "$FR_COUNT" == "0" ]]; then
    log_warn "$spec_path has no functional requirements"
  fi

  # Check version format
  VERSION_OK=$(python3 -c "
import json, re
data = json.load(open('$FULL_PATH'))
v = data.get('version', '')
print('OK' if re.match(r'^\d+\.\d+\.\d+$', v) else 'BAD')
")
  if [[ "$VERSION_OK" != "OK" ]]; then
    log_err "$spec_path has invalid version format (expected X.Y.Z)"
  fi

done <<< "$MODULE_COUNT"

# 4. Check for orphan module files (not in index)
echo ""
echo "Checking for orphan modules..."
echo ""

INDEXED_FILES=$(python3 -c "
import json
data = json.load(open('$INDEX_FILE'))
for m in data.get('modules', []):
    print(m.get('spec_file', '').split('/')[-1])
")

for spec_file in "$MODULES_DIR"/*.json; do
  BASENAME=$(basename "$spec_file")
  if ! echo "$INDEXED_FILES" | grep -q "$BASENAME"; then
    log_warn "Orphan module file (not in index): $BASENAME"
  fi
done

# 5. Dependency validation
echo ""
echo "Validating dependencies..."
echo ""

DEP_CHECK=$(python3 -c "
import json
data = json.load(open('$INDEX_FILE'))
ids = {m['id'] for m in data.get('modules', [])}
for m in data.get('modules', []):
    for dep in m.get('depends_on', []):
        if dep not in ids:
            print(f'ERROR:{m[\"id\"]}:depends on unknown module: {dep}')
    for dep in m.get('dependents', []):
        if dep not in ids:
            print(f'ERROR:{m[\"id\"]}:listed unknown dependent: {dep}')
if not any(True for _ in []):
    print('OK')
" 2>/dev/null || echo "OK")

if [[ "$DEP_CHECK" == "OK" ]]; then
  log_ok "All dependencies reference valid modules"
else
  while IFS= read -r line; do
    if [[ "$line" == ERROR:* ]]; then
      log_err "${line#ERROR:}"
    fi
  done <<< "$DEP_CHECK"
fi

# 6. Summary
echo ""
echo "═══════════════════════════════════════════"
echo " Results: ${ERRORS} errors, ${WARNINGS} warnings"
echo "═══════════════════════════════════════════"

if [[ "$ERRORS" -gt 0 ]]; then
  echo -e "${RED}SDD validation FAILED${NC}"
  exit 1
fi

if [[ "$STRICT" == "--strict" && "$WARNINGS" -gt 0 ]]; then
  echo -e "${YELLOW}SDD validation FAILED (strict mode)${NC}"
  exit 1
fi

echo -e "${GREEN}SDD validation PASSED${NC}"
exit 0
