#!/bin/sh
# Build the site into site/ from src/ with design D (themes/d.css), the reference design.
# Each page carries <!--#header--> and <!--#footer--> lines, replaced by src/_partials/;
# {{ROOT}} becomes the relative path to the site root, and the nav item named by
# the page's data-section gets aria-current.
# Designs A-C are retired to archive/ (tag prototypes-abcd builds all four).
set -eu
cd "$(dirname "$0")/.."

rm -rf site
mkdir -p site
cp -R src/. site/
rm -rf site/_partials
cp themes/d.css site/style.css

# The prototypes lived under /a/ to /d/; send old links to the same page at the root.
cat > site/_redirects <<'EOF'
/a/* /:splat 301
/b/* /:splat 301
/c/* /:splat 301
/d/* /:splat 301
EOF

find site -name '*.html' | while read -r f; do
  rel=${f#site/}
  slashes=$(printf '%s' "$rel" | tr -cd '/' | wc -c | tr -d ' ')
  root="./"
  i=0
  while [ "$i" -lt "$slashes" ]; do
    if [ "$i" -eq 0 ]; then root="../"; else root="../$root"; fi
    i=$((i + 1))
  done
  # 404.html is served at whatever unknown address was asked for, so its links must be absolute.
  if [ "$rel" = "404.html" ]; then root="/"; fi
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
    "$f"
done

if grep -rlIE '\{\{|<!--#' site >/dev/null; then
  echo "build: unreplaced placeholder in site/:" >&2
  grep -rnIE '\{\{|<!--#' site >&2
  exit 1
fi
echo "built site/ (design D at the root)"
