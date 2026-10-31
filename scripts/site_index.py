"""Build the Find page: a search index (find/index.json) and the site index list.

Run by build.sh on the assembled site/ (headers and footers already filled in).
Every page's <main> is split into sections at each h2, h3 or glossary <dt> that has
an id, so a search result links straight to the passage. The same walk writes the
list of every page and its sections into site/find/index.html at <!--#siteindex-->.
Fails loudly if a page lacks a title, a <main> or a description, or the marker is missing.
"""

import html
import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

SITE = Path(sys.argv[1])
FIND = SITE / "find" / "index.html"
MARKER = "<!--#siteindex-->"

# Nothing inside these is page text: the reading-position bar, the on-page contents,
# the "#" anchors beside headings, scripts and drawings.
SKIP_CLASSES = {"position", "toc", "anchor"}
SKIP_TAGS = {"script", "style", "svg", "button", "template"}
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"}
SECTION_TAGS = {"h2": 2, "h3": 3, "dt": 3}
CITE = {"cite-title"}
REFERENCE_LISTS = {"related-title", "see-also-title"}  # "Related" and "Sources" lists
# A word break at the edge of each of these; inline tags (em, a, strong) join without one,
# so "<em>Corollary</em>, SETP" reads "Corollary, SETP".
BLOCK = {"p", "div", "li", "dt", "dd", "h1", "h2", "h3", "h4", "blockquote", "figure", "figcaption",
         "table", "tr", "td", "th", "ul", "ol", "dl", "section", "aside", "header", "footer", "br", "pre"}


class MainText(HTMLParser):
    """Split a page's <main> into (level, anchor, heading, text) sections."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.in_main = False
        self.stack: list[tuple[str, bool]] = []  # (tag, skipping) for each open element in main
        self.sections: list[dict] = [{"level": 1, "a": "", "h": "", "t": []}]
        self.heading_tag = ""

    def skipping(self) -> bool:
        return any(skip for _, skip in self.stack)

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        a = dict(attrs)
        if tag == "main":
            self.in_main = True
            return
        if self.in_main and tag in BLOCK:
            self.handle_data(" ")
        if not self.in_main or tag in VOID:
            return
        classes = set((a.get("class") or "").split())
        skip = tag in SKIP_TAGS or bool(classes & SKIP_CLASSES)
        self.stack.append((tag, skip))
        if tag in SECTION_TAGS and a.get("id") and not self.skipping():
            self.sections.append({"level": SECTION_TAGS[tag], "a": a["id"], "h": "", "t": []})
            self.heading_tag = tag

    def handle_endtag(self, tag: str) -> None:
        if tag == "main":
            self.in_main = False
            return
        if not self.in_main or tag in VOID:
            return
        if tag in BLOCK:
            self.handle_data(" ")
        # Pop back to the matching open tag (tolerates an unclosed <p> or <li>).
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i][0] == tag:
                del self.stack[i:]
                break
        if tag == self.heading_tag:
            self.heading_tag = ""

    def handle_data(self, data: str) -> None:
        if not self.in_main or self.skipping():
            return
        cur = self.sections[-1]
        if self.heading_tag:
            cur["h"] += data
        else:
            cur["t"].append(data)


def squash(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip()


def one(pattern: str, text: str, page: Path) -> str:
    m = re.search(pattern, text)
    if not m:
        raise SystemExit(f"site_index: {page} has no match for {pattern}")
    return m.group(1)


def order_key(page: dict) -> tuple:
    """Home, then the ten-step reading path in order, then Briefing, About, Reference."""
    if page["u"] == "":
        return (0, 0, 0, "")
    m = re.match(r"Step (\d+) of \d+(?: · (?:Case study|Further thoughts) (\d+) of)?", page["pos"])
    if m:
        return (1, int(m.group(1)), int(m.group(2) or 0), page["u"])
    group = {"briefing": 2, "about": 3}.get(page["section"], 4)
    return (group, 0, 0, page["u"])


GROUPS = {0: "Start", 1: "The reading path, in order", 2: "Briefing Kit", 3: "About Mike", 4: "Reference"}

pages: list[dict] = []
entries: list[dict] = []
for path in sorted(SITE.rglob("*.html")):
    rel = path.relative_to(SITE).as_posix()
    if rel in ("404.html", "find/index.html"):
        continue
    text = path.read_text()
    title = html.unescape(one(r"<title>(.*?)</title>", text, path))
    desc = html.unescape(one(r'<meta name="description" content="(.*?)">', text, path))
    if "<main" not in text:
        raise SystemExit(f"site_index: {path} has no <main>")
    url = rel.removesuffix("index.html")
    name = "Home" if url == "" else re.sub(r" · (meiersafe\.com|Mike Meier)$", "", title)
    pos = re.search(r'class="pos-here">([^<]*)<', text)
    section = re.search(r'<body[^>]*data-section="([a-z-]*)"', text)
    parser = MainText()
    parser.feed(text)
    sections = [
        {"level": s["level"], "a": s["a"], "h": squash(s["h"]), "t": squash("".join(s["t"]))}
        for s in parser.sections
        if s["a"] not in CITE  # the citation block repeats the page title on every page
    ]
    pages.append({"u": url, "n": name, "d": desc, "pos": html.unescape(pos.group(1)) if pos else "",
                  "section": section.group(1) if section else "", "sections": sections})

pages.sort(key=order_key)
for i, p in enumerate(pages):
    for s in p["sections"]:
        if s["h"] or s["t"]:
            entry = {"p": i, "a": s["a"], "h": s["h"], "t": s["t"]}
            if s["a"] in REFERENCE_LISTS:
                entry["r"] = 1  # find.js ranks these below the passages they point to
            entries.append(entry)

index = {"pages": [{"u": p["u"], "n": p["n"]} for p in pages], "entries": entries}
(SITE / "find" / "index.json").write_text(json.dumps(index, ensure_ascii=False, separators=(",", ":")))

# The site index: every page, then its sections (h2), each followed by its sub-sections.
out: list[str] = []
group = -1
for p in pages:
    g = order_key(p)[0]
    if g != group:
        if group != -1:
            out.append("    </ul>")
        out.append(f'    <h3 class="si-group">{GROUPS[g]}</h3>\n    <ul class="si-pages">')
        group = g
    href = "../" + p["u"]
    lead = html.escape(p["pos"].split(" · ")[0]) + " · " if p["pos"].startswith("Step") else ""
    out.append(f'      <li><a class="si-page" href="{href}">{html.escape(p["n"])}</a>'
               f' <span class="si-desc">{lead}{html.escape(p["d"])}</span>')
    heads = [s for s in p["sections"] if s["a"] and s["h"]]
    if heads:
        out.append('        <ul class="si-sections">')
        open_li = False
        subs: list[str] = []
        for s in heads:
            link = f'<a href="{href}#{html.escape(s["a"])}">{html.escape(s["h"])}</a>'
            if s["level"] == 2:
                if open_li:
                    out.append(("          <li>" + top + (' <span class="si-subs">' + " · ".join(subs) + "</span>" if subs else "") + "</li>"))
                top, subs, open_li = link, [], True
            elif open_li:
                subs.append(link)
            else:
                out.append(f"          <li>{link}</li>")
        if open_li:
            out.append(("          <li>" + top + (' <span class="si-subs">' + " · ".join(subs) + "</span>" if subs else "") + "</li>"))
        out.append("        </ul>")
    out.append("      </li>")
out.append("    </ul>")

find_html = FIND.read_text()
if find_html.count(MARKER) != 1:
    raise SystemExit(f"site_index: {FIND} must contain {MARKER} exactly once")
FIND.write_text(find_html.replace(MARKER, "\n".join(out)))
print(f"site_index: {len(pages)} pages, {len(entries)} sections indexed; find/index.json written")
