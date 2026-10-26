"""Print the one-page handout to src/briefing/handout/meiersafe-handout.pdf.

Run after any change to the handout page, the partials or the stylesheet:

    ./scripts/build.sh && uv run python scripts/handout_pdf.py

It prints the built page (site/briefing/handout/) with Chrome on US Letter, fails unless the
result is exactly one page, and records a hash of its inputs beside the PDF. build.sh refuses
to build while that hash no longer matches, so the PDF cannot drift from the page.
"""

import hashlib
import subprocess
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parent.parent
PAGE = ROOT / "site" / "briefing" / "handout" / "index.html"
OUT = ROOT / "src" / "briefing" / "handout" / "meiersafe-handout.pdf"
STAMP = ROOT / "scripts" / "handout_pdf.sha256"


def inputs_hash() -> str:
    """The same hash build.sh computes: shasum -a 256 over the handout's inputs, in order."""
    out = subprocess.run(["sh", str(ROOT / "scripts" / "handout_hash.sh")], cwd=ROOT,
                         check=True, capture_output=True, text=True)
    return out.stdout.strip()


if not PAGE.exists():
    raise SystemExit(f"handout_pdf: {PAGE} not built; run ./scripts/build.sh first")
with sync_playwright() as p:
    browser = p.chromium.launch(channel="chrome")
    page = browser.new_page()
    page.goto(PAGE.as_uri())
    page.wait_for_load_state("networkidle")
    page.evaluate("document.fonts.ready")
    page.pdf(path=str(OUT), format="Letter", print_background=False)
    browser.close()

pages = len(PdfReader(OUT).pages)
if pages != 1:
    OUT.unlink()
    raise SystemExit(f"handout_pdf: the handout printed to {pages} pages, not 1; PDF not written")
fonts = subprocess.run(["pdffonts", str(OUT)], check=True, capture_output=True, text=True).stdout
if "IBMPlex" not in fonts:
    OUT.unlink()
    raise SystemExit(f"handout_pdf: IBM Plex not embedded; PDF not written\n{fonts}")
STAMP.write_text(inputs_hash() + "\n")
print(f"handout_pdf: {OUT.relative_to(ROOT)} written, 1 page, {OUT.stat().st_size:,} bytes", file=sys.stderr)
