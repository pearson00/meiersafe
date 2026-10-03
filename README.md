# meiersafe.com

The website for Mike Meier's *Lessons Learned and Murphy's Corollary*.

**Status: design prototypes.** Four directions (A Reference, B Briefing, C Narrative, D Briefing quieter) share the same pages and text; only the theme differs.

- `src/` — the pages, written once, with a `{{LABEL}}` placeholder for the prototype name
- `themes/` — one stylesheet per design
- `chooser.html` — the landing page that links the four designs
- `scripts/build.sh` — builds `site/` (chooser plus `a/` to `d/`)
- `site/` — the built site, committed; Cloudflare Pages publishes this folder with no build step

Rebuild after editing `src/` or `themes/`:

```sh
./scripts/build.sh
```

Content is © Mike Meier and licensed [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/); third-party material is excluded.
