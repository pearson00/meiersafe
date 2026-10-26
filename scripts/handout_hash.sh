#!/bin/sh
# Hash of everything the one-page handout PDF is printed from (see handout_pdf.py).
set -eu
cd "$(dirname "$0")/.."
cat src/briefing/handout/index.html src/_partials/header.html src/_partials/footer.html themes/d.css src/fonts/*.woff2 | shasum -a 256 | cut -d' ' -f1
