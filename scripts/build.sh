#!/bin/sh
# Build the site into site/ from src/ with design D (themes/d.css), the reference design.
# Each page carries <!--#header--> and <!--#footer--> lines, replaced by src/_partials/;
# {{ROOT}} becomes the relative path to the site root, and the nav item named by
# the page's data-section gets aria-current ("page" on the section's own page, "true" below it).
# Every page except 404 gets a canonical link to its meiersafe.com address.
# DRAFT=1 (the default until launch) adds noindex to every page; build with DRAFT=0 to launch.
# Designs A-C are retired to archive/ (tag prototypes-abcd builds all four).
set -eu
cd "$(dirname "$0")/.."
DRAFT=${DRAFT:-1}

rm -rf site
mkdir -p site
cp -R src/. site/
rm -rf site/_partials
cp themes/d.css site/style.css

# The prototypes lived under /a/ to /d/; send old links to the same page at the root.
# The WordPress site (until November 2026) used the addresses below; each goes to its nearest page.
cat > site/_redirects <<'EOF'
/a/* /:splat 301
/b/* /:splat 301
/c/* /:splat 301
/d/* /:splat 301
/about-mike-meier/awards-and-elections/ /about/ 301
/about-mike-meier/* /about/ 301
/about-mike-meier /about/ 301
/mike-meier/ /about/ 301
/mike-meier /about/ 301
/introduction/ / 301
/introduction / 301
/safety-and-risk-mitigation/ /framework/ 301
/safety-and-risk-mitigation /framework/ 301
/contact-and-booking/ /about/#contact 301
/contact-and-booking /about/#contact 301
/video/ /speaking/#video 301
/video /speaking/#video 301
/home/news/ /speaking/ 301
/home/news /speaking/ 301
/home/ / 301
/home / 301
/speaking/testimonials/ /speaking/#testimonials 301
/speaking/testimonials /speaking/#testimonials 301
/testimonials/* /speaking/#testimonials 301
/testimonials /speaking/#testimonials 301
/2015/03/28/jack-northrop-award/ /about/ 301
/2015/05/17/rogallo-foundation-hall-of-fame-induction/ /about/ 301
/2016/03/11/rob-kells-memorial-award-from-ushpa/ /about/ 301
/2016/05/13/128/ /speaking/ 301
/2016/07/18/mike-meier-at-scaled-composites/ /speaking/ 301
/2016/07/28/eaa-airventure-2016/ /speaking/ 301
/2018/01/26/gulfstream-aerospace/ /speaking/ 301
/2015/* /about/ 301
/2016/* /speaking/ 301
/2018/* /speaking/ 301
/author/* /about/ 301
/category/* / 301
/feed/* / 301
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
    if [ "$rel" = "$section/index.html" ]; then current="page"; else current="true"; fi
    sed -i '' "s/{{CUR_$section}}/ aria-current=\"$current\"/" "$f"
  fi
  sed -i '' \
    -e 's/{{CUR_[a-z-]*}}//g' \
    -e "s#{{ROOT}}#$root#g" \
    "$f"
  if [ "$rel" != "404.html" ]; then
    path=${rel%index.html}
    sed -i '' "s#<link rel=\"stylesheet\"#<link rel=\"canonical\" href=\"https://meiersafe.com/$path\">\\
<link rel=\"stylesheet\"#" "$f"
  fi
  if [ "$DRAFT" = "1" ]; then
    sed -i '' 's#<meta name="viewport" content="width=device-width, initial-scale=1">#&\
<meta name="robots" content="noindex, nofollow">#' "$f"
  fi
done

# The Find page: search index and the list of every page and its sections.
python3 scripts/site_index.py site

# Link previews, author data and the site map (Mike's yes to S1-S4, October 25, 2026).
python3 scripts/head_meta.py site

# Search yes, AI answers yes, AI training no (Mike's answer to S5, October 25, 2026).
cat > site/robots.txt <<'EOF'
# meiersafe.com: search yes, AI answers yes, AI training no (contentsignals.org)
User-agent: *
Content-Signal: search=yes, ai-input=yes, ai-train=no
Allow: /

Sitemap: https://meiersafe.com/sitemap.xml
EOF

# Security headers: HTTPS only, and nothing loads from anywhere but this site, except the Vimeo player.
cat > site/_headers <<'EOF'
/*
  Strict-Transport-Security: max-age=31536000
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; media-src 'self'; frame-src https://player.vimeo.com; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
EOF

if grep -rlIE '\{\{|<!--#' site >/dev/null; then
  echo "build: unreplaced placeholder in site/:" >&2
  grep -rnIE '\{\{|<!--#' site >&2
  exit 1
fi

# The one-page handout PDF is printed from the page by scripts/handout_pdf.py; refuse to finish
# while the page, partials, stylesheet or fonts have changed since it was last printed.
if [ "$(sh scripts/handout_hash.sh)" != "$(cat scripts/handout_pdf.sha256 2>/dev/null)" ] || [ ! -f site/briefing/handout/meiersafe-handout.pdf ]; then
  echo "build: the handout PDF is out of date. Run: uv run python scripts/handout_pdf.py, then build again." >&2
  exit 1
fi

# Launch build: nothing marked as draft may remain (launch-cleanup audit, section 5).
# Only pages are searched; style.css names these classes too. The December 11 brief stays "(planned)" until it happens.
if [ "$DRAFT" = "0" ]; then
  left=$(grep -rnIE 'class="(proto-banner|draft-flag|placeholder)|\[unclear\]|\(planned\)' site --include='*.html' | grep -v 'December 11, 2026' || true)
  if [ -n "$left" ]; then
    echo "build: draft markers remain in a launch build:" >&2
    echo "$left" >&2
    exit 1
  fi
fi
if [ "$DRAFT" = "1" ]; then mode="draft: noindex on every page"; else mode="launch: indexable"; fi
echo "built site/ (design D at the root; $mode)"
