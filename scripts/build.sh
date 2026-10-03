#!/bin/sh
# Build the four prototypes into site/: same pages from src/, a different theme each.
set -eu
cd "$(dirname "$0")/.."

rm -rf site
mkdir -p site
cp chooser.html site/index.html

for t in a b c d; do
  case $t in
    a) label="A · Reference" ;;
    b) label="B · Briefing" ;;
    c) label="C · Narrative" ;;
    d) label="D · Briefing, quieter" ;;
  esac
  mkdir -p "site/$t"
  cp -R src/. "site/$t/"
  cp "themes/$t.css" "site/$t/style.css"
  find "site/$t" -name '*.html' -exec sed -i '' "s/{{LABEL}}/$label/g" {} +
done

if grep -rl '{{' site >/dev/null; then
  echo "build: unreplaced placeholder in site/" >&2
  exit 1
fi
echo "built site/ (chooser + a, b, c, d)"
