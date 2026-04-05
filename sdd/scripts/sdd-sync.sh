#!/usr/bin/env bash
# sdd-sync.sh — Synchronizes SDD specs with the actual codebase
# Scans source files and updates file lists, detects new/removed files,
# bumps version patch, and updates last_updated timestamp.
# Usage: bash sdd/scripts/sdd-sync.sh [module-id] [--dry-run]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SDD_ROOT="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$SDD_ROOT")"
INDEX_FILE="$SDD_ROOT/sdd_index.json"
TARGET_MODULE="${1:-all}"
DRY_RUN="${2:-}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo "═══════════════════════════════════════════"
echo " SDD Sync — Vision7"
echo " Target: ${TARGET_MODULE}"
[[ "$DRY_RUN" == "--dry-run" ]] && echo " Mode: DRY RUN"
echo "═══════════════════════════════════════════"
echo ""

cd "$PROJECT_ROOT"

export SDD_INDEX_FILE="$INDEX_FILE"
export SDD_TARGET_MODULE="$TARGET_MODULE"
export SDD_DRY_RUN="$DRY_RUN"

python3 << 'PYTHON_SYNC'
import json, os, glob, sys
from datetime import date

INDEX_FILE = os.environ.get("SDD_INDEX_FILE", "sdd/sdd_index.json")
TARGET = os.environ.get("SDD_TARGET_MODULE", "all")
DRY_RUN = os.environ.get("SDD_DRY_RUN", "") == "--dry-run"

index = json.load(open(INDEX_FILE))
today = date.today().isoformat()

# File pattern to module mapping
FILE_PATTERNS = {
    "news-aggregator": {
        "components": ["src/components/content/*.tsx", "src/components/admin/PostForm.tsx", "src/components/admin/RichTextEditor.tsx"],
        "hooks": ["src/hooks/usePosts.ts", "src/hooks/usePagination.ts"],
        "pages": ["src/pages/site/PostPage.tsx", "src/pages/site/CategoryPage.tsx", "src/pages/site/Index.tsx"]
    },
    "cms": {
        "components": ["src/components/admin/*.tsx"],
        "hooks": ["src/hooks/usePosts.ts", "src/hooks/useCourses.ts", "src/hooks/usePodcasts.ts",
                   "src/hooks/useCategories.ts", "src/hooks/useNewsletter.ts", "src/hooks/useSiteSettings.ts",
                   "src/hooks/useUserProfiles.ts", "src/hooks/useAdminAccess.ts"],
        "pages": ["src/pages/admin/*.tsx"]
    },
    "frontend-ui": {
        "components": ["src/components/layout/*.tsx", "src/components/content/*.tsx",
                       "src/components/system/*.tsx", "src/components/media/*.tsx"],
        "hooks": ["src/hooks/useTheme.ts", "src/hooks/use-mobile.tsx", "src/hooks/useSticky.ts",
                  "src/hooks/useUserLocation.ts"],
        "pages": ["src/pages/site/*.tsx"]
    },
    "automation-n8n": {
        "pages": ["src/pages/admin/AdminAutomation.tsx"],
        "services": ["src/services/n8n.ts"],
        "types": ["src/types/automation.ts"]
    },
    "analytics": {
        "hooks": ["src/hooks/useAnalytics.ts", "src/hooks/useMonetization.ts"]
    },
    "tags-taxonomy": {
        "components": ["src/components/content/CategoryBadge.tsx", "src/components/content/CategorySection.tsx",
                       "src/components/admin/CategoryManager.tsx", "src/components/admin/TagManager.tsx"],
        "hooks": ["src/hooks/useCategories.ts"],
        "pages": ["src/pages/site/CategoryPage.tsx"]
    },
    "auth-security": {
        "hooks": ["src/hooks/useAdminAccess.ts", "src/hooks/useUserProfiles.ts"],
        "pages": ["src/pages/admin/AdminLogin.tsx"]
    },
    "supabase-database": {
        "services": ["src/integrations/supabase/client.ts"],
        "types": ["src/integrations/supabase/types.ts"],
        "migrations": ["supabase/migrations/*.sql"]
    }
}

def bump_patch(version):
    parts = version.split(".")
    if len(parts) == 3:
        parts[2] = str(int(parts[2]) + 1)
    return ".".join(parts)

def resolve_globs(patterns):
    files = []
    for p in patterns:
        matches = sorted(glob.glob(p))
        files.extend(matches)
    return list(dict.fromkeys(files))  # dedupe preserving order

updated = 0
for mod in index["modules"]:
    mod_id = mod["id"]
    if TARGET != "all" and mod_id != TARGET:
        continue

    spec_path = mod["spec_file"]
    if not os.path.exists(spec_path):
        print(f"\033[0;31m✗\033[0m Spec file not found: {spec_path}")
        continue

    spec = json.load(open(spec_path))
    changes = []

    # Sync file lists
    patterns = FILE_PATTERNS.get(mod_id, {})
    if patterns:
        current_files = spec.get("files", {})
        for category, globs in patterns.items():
            resolved = resolve_globs(globs)
            existing = current_files.get(category, [])
            if set(resolved) != set(existing):
                added = set(resolved) - set(existing)
                removed = set(existing) - set(resolved)
                if added:
                    changes.append(f"  + {category}: {', '.join(sorted(added))}")
                if removed:
                    changes.append(f"  - {category}: {', '.join(sorted(removed))}")
                current_files[category] = resolved
        spec["files"] = current_files

    if changes:
        old_version = spec.get("version", "0.0.0")
        new_version = bump_patch(old_version)
        spec["version"] = new_version
        spec["last_updated"] = today

        # Add to change history
        history = spec.get("change_history", [])
        history.append({
            "date": today,
            "version": new_version,
            "author": "sdd-sync",
            "description": f"Auto-sync: file list updated"
        })
        spec["change_history"] = history

        # Update index version
        mod["version"] = new_version

        print(f"\033[0;32m✓\033[0m {spec['module']} ({old_version} → {new_version})")
        for c in changes:
            print(f"  {c}")

        if not DRY_RUN:
            with open(spec_path, "w") as f:
                json.dump(spec, f, indent=2, ensure_ascii=False)
                f.write("\n")
        updated += 1
    else:
        print(f"\033[0;36m○\033[0m {spec.get('module', mod_id)} — no changes")

# Save updated index
if updated > 0 and not DRY_RUN:
    index["last_updated"] = today
    with open(INDEX_FILE, "w") as f:
        json.dump(index, f, indent=2, ensure_ascii=False)
        f.write("\n")

print(f"\n{'DRY RUN: ' if DRY_RUN else ''}{updated} module(s) updated")

PYTHON_SYNC
