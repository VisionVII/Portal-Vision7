#!/usr/bin/env bash
# sdd-status.sh — Dashboard view of all SDD modules
# Usage: bash sdd/scripts/sdd-status.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SDD_ROOT="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$SDD_ROOT")"
INDEX_FILE="$SDD_ROOT/sdd_index.json"

cd "$PROJECT_ROOT"

python3 << 'PYEOF'
import json

GREEN = "\033[0;32m"
YELLOW = "\033[1;33m"
CYAN = "\033[0;36m"
RED = "\033[0;31m"
NC = "\033[0m"
BOLD = "\033[1m"

index = json.load(open("sdd/sdd_index.json"))

print("═" * 70)
print(f" {BOLD}Vision7 SDD Dashboard{NC}")
print(f" Project v{index['version']} — Last updated: {index['last_updated']}")
print("═" * 70)
print()

# Status colors
status_color = {
    "Finalizado": GREEN,
    "Em desenvolvimento": YELLOW,
    "Pendente": CYAN,
    "Depreciado": RED,
}

# Module summary
print(f"{BOLD}Modules:{NC}")
print()
for mod in index["modules"]:
    try:
        spec = json.load(open(mod["spec_file"]))
    except:
        print(f"  {RED}✗{NC} {mod['name']} — spec file missing")
        continue

    status = spec["status"]
    color = status_color.get(status, NC)

    fr_total = len(spec.get("functional_requirements", []))
    fr_done = sum(1 for f in spec.get("functional_requirements", []) if f.get("status") in ("Finalizado", "Testado"))

    qa_total = len(spec.get("qa_tests", []))
    qa_done = sum(1 for q in spec.get("qa_tests", []) if q.get("status") in ("Finalizado",))

    deps = len(spec.get("dependencies", {}).get("modules", []))
    files_count = sum(len(v) for v in spec.get("files", {}).values() if isinstance(v, list))

    print(f"  {color}●{NC} {spec['module']:<25} v{spec['version']:<8} {color}{status:<20}{NC}")
    print(f"    FR: {fr_done}/{fr_total}  QA: {qa_done}/{qa_total}  Deps: {deps}  Files: {files_count}")

# Statistics
print()
print("═" * 70)
stats = index.get("statistics", {})
total = stats.get("total_modules", 0)
done = stats.get("finalized", 0)
dev = stats.get("in_development", 0)
pending = stats.get("pending", 0)

print(f" {BOLD}Summary:{NC} {total} modules | {GREEN}{done} finalized{NC} | {YELLOW}{dev} in development{NC} | {CYAN}{pending} pending{NC}")
print(f" {BOLD}Requirements:{NC} {stats.get('total_functional_requirements', 0)} FRs | {stats.get('total_qa_tests', 0)} QA tests")
print()

# Dependency layers
print(f"{BOLD}Architecture Layers:{NC}")
for layer in index.get("dependency_graph", {}).get("layers", []):
    mods = ", ".join(layer["modules"])
    print(f"  L{layer['layer']}: {layer['name']:<25} [{mods}]")

print()
print("═" * 70)
PYEOF
