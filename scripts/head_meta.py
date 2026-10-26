"""Add link-preview tags and author data to every built page, and write sitemap.xml.

Run by build.sh after site/ is assembled. Each page's title, description and
canonical address are read from its own head, so the tags never drift from the page.
Fails loudly if a page lacks any of the three.
"""

import html
import json
import re
import sys
from pathlib import Path

SITE = Path(sys.argv[1])
ORIGIN = "https://meiersafe.com"
CARD = f"{ORIGIN}/card.png"

AUTHOR = {
    "@type": "Person",
    "name": "Mike Meier",
    "url": f"{ORIGIN}/about/",
    "jobTitle": "Test pilot",
    "award": "Fellow, Society of Experimental Test Pilots (2026)",
    "memberOf": {"@type": "Organization", "name": "Society of Experimental Test Pilots"},
}
PAPER = {
    "@type": "ScholarlyArticle",
    "name": "Lessons Learned and Murphy's Corollary",
    "author": {"@type": "Person", "name": "Mike Meier"},
    "datePublished": "2015",
    "url": f"{ORIGIN}/the-paper/",
}


def one(pattern: str, text: str, page: Path) -> str:
    m = re.search(pattern, text)
    if not m:
        raise SystemExit(f"head_meta: {page} has no match for {pattern}")
    return m.group(1)


urls = []
for page in sorted(SITE.rglob("*.html")):
    if page.name == "404.html":
        continue
    text = page.read_text()
    title = one(r"<title>(.*?)</title>", text, page)
    desc = one(r'<meta name="description" content="(.*?)">', text, page)
    url = one(r'<link rel="canonical" href="(.*?)">', text, page)
    name = re.sub(r" · (meiersafe\.com|Mike Meier)$", "", html.unescape(title))
    # Article pages already carry their own block (headline, edition date): give it the
    # full author and source. Other pages get a WebPage block.
    existing = re.search(r'<script type="application/ld\+json">(.*?)</script>\n?', text, re.S)
    if existing:
        data = json.loads(existing.group(1))
        text = text.replace(existing.group(0), "", 1)
    else:
        data = {"@context": "https://schema.org", "@type": "WebPage", "name": name,
                "description": html.unescape(desc), "url": url}
    data["author"] = AUTHOR
    data["license"] = "https://creativecommons.org/licenses/by-sa/4.0/"
    if url != PAPER["url"]:
        data["isBasedOn"] = PAPER
    attr = html.escape(name, quote=True)
    tags = "\n".join([
        '<meta property="og:type" content="website">',
        '<meta property="og:site_name" content="meiersafe.com">',
        f'<meta property="og:title" content="{attr}">',
        f'<meta property="og:description" content="{desc}">',
        f'<meta property="og:url" content="{url}">',
        f'<meta property="og:image" content="{CARD}">',
        '<meta property="og:image:width" content="1200">',
        '<meta property="og:image:height" content="630">',
        '<meta property="og:image:alt" content="Anything that did not go wrong could not have gone wrong. Mike Meier, meiersafe.com">',
        '<meta name="twitter:card" content="summary_large_image">',
        '<script type="application/ld+json">' + json.dumps(data, ensure_ascii=False).replace("</", "<\\/") + "</script>",
    ])
    marker = f'<link rel="canonical" href="{url}">'
    page.write_text(text.replace(marker, marker + "\n" + tags, 1))
    urls.append(url)

lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
lines += [f"  <url><loc>{html.escape(u)}</loc></url>" for u in urls]
lines.append("</urlset>")
(SITE / "sitemap.xml").write_text("\n".join(lines) + "\n")
print(f"head_meta: {len(urls)} pages tagged; sitemap.xml written")
