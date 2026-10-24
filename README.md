# meiersafe.com

The website for Mike Meier's *Lessons Learned and Murphy's Corollary*.

**Status: draft for Mike's review, launching November 12, 2026.** Design D is the reference design; any future variation starts from it. Designs A–C are retired to `archive/` (October 24, 2026); the tag `prototypes-abcd` builds all four.

- `src/` — the pages. Each page has `<!--#header-->` and `<!--#footer-->` lines, filled from `src/_partials/`; `{{ROOT}}` is the relative path to the site root, and the page's `data-section` marks the current nav item
- `themes/d.css` — the stylesheet, published as `style.css`
- `scripts/build.sh` — builds `site/`, with design D at the root and redirects from the old `/a/` to `/d/` addresses
- `site/` — the built site, committed; Cloudflare Pages publishes this folder with no build step
- `archive/` — the retired designs A–C and the old design chooser

Rebuild after editing `src/` or `themes/`:

```sh
./scripts/build.sh
```

Content is © Mike Meier and licensed [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/); third-party material is excluded.
