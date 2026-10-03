#!/bin/sh
# Build the four prototypes into site/: same pages from src/, a different theme each.
# Each page carries <!--#header--> and <!--#footer--> lines, replaced by src/_partials/;
# {{ROOT}} becomes the relative path to the prototype's root, and the nav item named by
# the page's data-section gets aria-current.
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
  rm -rf "site/$t/_partials"
  cp "themes/$t.css" "site/$t/style.css"

  find "site/$t" -name '*.html' | while read -r f; do
    rel=${f#site/$t/}
    slashes=$(printf '%s' "$rel" | tr -cd '/' | wc -c | tr -d ' ')
    root="./"
    i=0
    while [ "$i" -lt "$slashes" ]; do
      if [ "$i" -eq 0 ]; then root="../"; else root="../$root"; fi
      i=$((i + 1))
    done
    section=$(sed -n 's/.*<body[^>]*data-section="\([a-z-]*\)".*/\1/p' "$f")
    sed -i '' \
      -e '/<!--#header-->/{' -e 'r src/_partials/header.html' -e 'd' -e '}' \
      -e '/<!--#footer-->/{' -e 'r src/_partials/footer.html' -e 'd' -e '}' \
      "$f"
    if [ -n "$section" ]; then
      sed -i '' "s/{{CUR_$section}}/ aria-current=\"page\"/" "$f"
    fi
    sed -i '' \
      -e 's/{{CUR_[a-z-]*}}//g' \
      -e "s#{{ROOT}}#$root#g" \
      -e "s/{{LABEL}}/$label/g" \
      "$f"
  done
done

if grep -rlE '\{\{|<!--#' site >/dev/null; then
  echo "build: unreplaced placeholder in site/:" >&2
  grep -rnE '\{\{|<!--#' site >&2
  exit 1
fi
echo "built site/ (chooser + a, b, c, d)"
