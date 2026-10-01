#!/usr/bin/env bash
# Trava do site público: falha se aparecer qualquer coisa que pareça código ou pacote da extensão.
# Roda no pre-commit (.githooks) e no GitHub Actions (.github/workflows/guard.yml).
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

fail=0
err() { echo "guard: $*" >&2; fail=1; }

# arquivos que vão para o repositório (rastreados + preparados para o commit)
mapfile -t files < <( { git ls-files; git diff --cached --name-only --diff-filter=AM; } | sort -u | while read -r f; do [ -f "$f" ] && echo "$f"; done )

for f in "${files[@]}"; do
  case "$f" in
    tools/*|.githooks/*|.github/*|.gitignore|.gitattributes|.nojekyll|README.md|robots.txt|sitemap.xml) continue ;;
  esac
  case "$f" in
    *.html|*.css|*.svg|*.png|*.jpg|*.webp|*.ico|*.woff2|*.txt) ;;
    assets/site.js) ;;
    *) err "tipo de arquivo não permitido no site: $f" ;;
  esac
  base=$(basename "$f")
  case "$base" in
    manifest.json|package.json|*.map|*.crx|*.zip|*.wasm|*.onnx|*.mjs|*.ts|*.tsx) err "arquivo proibido: $f" ;;
  esac
done

# assinaturas de código da extensão / build (texto de HTML, CSS e do único JS do site)
pattern='chrome\.(runtime|storage|tabs|bookmarks|offscreen|scripting|sidePanel)|browser\.runtime|sourceMappingURL|onnxruntime|@huggingface|transformers\.js|\bdexie\b|minisearch|import\.meta|__vite|\bwxt\b|manifest_version|webpackChunk|chrome-extension://[a-p]{32}'
for f in "${files[@]}"; do
  case "$f" in
    tools/*|.githooks/*|.github/*) continue ;;
    *.html|*.css|*.js|*.svg|*.txt|*.md|*.xml)
      if grep -nEi "$pattern" "$f" >/dev/null; then
        err "possível código da extensão em $f:"; grep -nEi "$pattern" "$f" | head -5 >&2
      fi ;;
  esac
done

# o único script do site é pequeno e escrito à mão
if [ -f assets/site.js ]; then
  size=$(wc -c < assets/site.js)
  [ "$size" -le 30000 ] || err "assets/site.js com $size bytes — maior que o esperado para o site"
fi

[ "$fail" -eq 0 ] && echo "guard: ok (${#files[@]} arquivos)"
exit "$fail"
