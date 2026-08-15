#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/wordpress-plugin/ai-growth-os.zip"
cd "$ROOT/wordpress-plugin"
rm -f ai-growth-os.zip
zip -r ai-growth-os.zip ai-growth-os -x "*.DS_Store" -x "*__MACOSX*"
echo "Wrote $OUT"
ls -la "$OUT"
