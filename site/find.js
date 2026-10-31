// Search on the Find page. The index (find/index.json) is written at build time by
// scripts/site_index.py: one entry per section of every page. Every word typed must
// appear in a section for it to match; headings and page names rank above body text.
// Without JavaScript the search box stays hidden and the site index below still works.
(function () {
  var box = document.getElementById("find-search");
  var q = document.getElementById("find-q");
  var status = document.getElementById("find-status");
  var list = document.getElementById("find-results");
  var script = document.currentScript;
  if (!box || !q || !status || !list || !script) return;
  box.hidden = false;

  var MAX = 40;
  var index = null;
  var loading = null;
  var timer = null;

  function load() {
    if (!loading) {
      // Resolved from this script's own address (the site root), so /find without a slash works too.
      loading = fetch(new URL("find/index.json", script.src))
        .then(function (r) {
          if (!r.ok) throw new Error("HTTP " + r.status);
          return r.json();
        })
        .then(function (data) {
          index = data;
          data.entries.forEach(function (e) {
            e.hl = fold(e.h);
            e.tl = fold(e.t);
            e.nl = fold(data.pages[e.p].n);
          });
        })
        .catch(function (err) {
          status.textContent = "The search index could not be loaded (" + err.message + "). The list of every page below still works.";
          throw err;
        });
    }
    return loading;
  }

  // Lower case, curly apostrophes made straight. Same length as the input, so a match
  // position in the folded text is the same position in the original.
  function fold(s) {
    return s.toLowerCase().replace(/[‘’]/g, "'");
  }

  // "murphys" finds "Murphy's": an apostrophe may sit between any two letters.
  function termRegex(term) {
    var chars = term.replace(/'/g, "").split("").map(function (c) {
      return c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    });
    return new RegExp(chars.join("'?"), "g");
  }

  function count(re, s) {
    re.lastIndex = 0;
    var n = 0;
    while (re.exec(s) && n < 5) n++;
    return n;
  }

  function search(query) {
    var terms = fold(query).split(/\s+/).filter(function (t) { return t.replace(/'/g, "").length > 0; });
    if (!terms.length) return { hits: [], res: [] };
    var res = terms.map(termRegex);
    var phrase = terms.length > 1 ? termRegex(terms.join(" ")) : null;
    var hits = [];
    index.entries.forEach(function (e) {
      var score = 0;
      for (var i = 0; i < res.length; i++) {
        var h = count(res[i], e.hl), n = count(res[i], e.nl), t = count(res[i], e.tl);
        if (!h && !n && !t) return;
        score += h * 10 + n * 4 + t;
      }
      if (phrase && (count(phrase, e.hl) || count(phrase, e.tl))) score += 15;
      if (e.r) score = score / 3; // "Related" and "Sources" lists: below the passages themselves
      hits.push({ e: e, score: score });
    });
    hits.sort(function (a, b) { return b.score - a.score || a.e.p - b.e.p; });
    return { hits: hits, res: res };
  }

  // Append text to el with every match of any term wrapped in <mark>.
  function marked(el, text, res) {
    var folded = fold(text), spans = [];
    res.forEach(function (re) {
      re.lastIndex = 0;
      var m;
      while ((m = re.exec(folded))) {
        if (!m[0].length) { re.lastIndex++; continue; }
        spans.push([m.index, m.index + m[0].length]);
      }
    });
    spans.sort(function (a, b) { return a[0] - b[0]; });
    var at = 0;
    spans.forEach(function (s) {
      if (s[0] < at) return;
      el.appendChild(document.createTextNode(text.slice(at, s[0])));
      var mk = document.createElement("mark");
      mk.textContent = text.slice(s[0], s[1]);
      el.appendChild(mk);
      at = s[1];
    });
    el.appendChild(document.createTextNode(text.slice(at)));
  }

  // About 220 characters of body text around the first match.
  function snippet(e, res) {
    var first = -1;
    res.forEach(function (re) {
      re.lastIndex = 0;
      var m = re.exec(e.tl);
      if (m && (first < 0 || m.index < first)) first = m.index;
    });
    if (first < 0) return e.t.slice(0, 220) + (e.t.length > 220 ? " …" : "");
    var start = Math.max(0, first - 80);
    var sp = e.t.lastIndexOf(" ", start);
    if (start > 0 && sp > start - 20) start = sp + 1;
    var end = Math.min(e.t.length, start + 220);
    return (start > 0 ? "… " : "") + e.t.slice(start, end) + (end < e.t.length ? " …" : "");
  }

  function render() {
    var query = q.value.trim();
    var url = new URL(location.href);
    if (query) url.searchParams.set("q", query); else url.searchParams.delete("q");
    history.replaceState(null, "", url);
    list.textContent = "";
    if (query.replace(/'/g, "").length < 2) {
      status.textContent = "";
      return;
    }
    var found = search(query);
    var hits = found.hits;
    if (!hits.length) {
      status.textContent = "Nothing matches “" + query + "”. Try fewer or shorter words, or browse every page below.";
      return;
    }
    var pagesHit = {};
    hits.forEach(function (h) { pagesHit[h.e.p] = true; });
    var np = Object.keys(pagesHit).length;
    status.textContent = hits.length + (hits.length === 1 ? " passage" : " passages") + " on " + np + (np === 1 ? " page" : " pages") +
      " match “" + query + "”" + (hits.length > MAX ? "; the best " + MAX + " are shown." : ".");
    hits.slice(0, MAX).forEach(function (h) {
      var e = h.e, page = index.pages[e.p];
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.className = "find-hit";
      a.href = "../" + page.u + (e.a ? "#" + e.a : "");
      var where = document.createElement("span");
      where.className = "find-where";
      marked(where, page.n, found.res);
      a.appendChild(where);
      if (e.h) {
        a.appendChild(document.createTextNode(" › "));
        var head = document.createElement("span");
        marked(head, e.h, found.res);
        a.appendChild(head);
      }
      li.appendChild(a);
      if (e.t) {
        var p = document.createElement("p");
        p.className = "find-snippet";
        marked(p, snippet(e, found.res), found.res);
        li.appendChild(p);
      }
      list.appendChild(li);
    });
  }

  q.addEventListener("input", function () {
    clearTimeout(timer);
    timer = setTimeout(function () { load().then(render, function () {}); }, 120);
  });
  q.addEventListener("focus", function () { load().catch(function () {}); });

  var initial = new URL(location.href).searchParams.get("q");
  if (initial) {
    q.value = initial;
    load().then(render, function () {});
  }
})();
