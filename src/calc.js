// Cumulative failure: 1 - p^n. Invalid input shows a dash rather than a number.
// Optional extras, each used only when its element is on the page: a 100-square grid
// (100 crews making the same series of decisions), a "run it" button that simulates
// those 100 crews once, and preset buttons that fill in both numbers.
(function () {
  var p = document.getElementById("calc-p");
  var n = document.getElementById("calc-n");
  var out = document.getElementById("calc-out");
  var odds = document.getElementById("calc-odds");
  var half = document.getElementById("calc-half"); // optional: decisions until failure passes 50%
  var halfUnit = document.getElementById("calc-half-unit"); // optional: "decision(s)" after it
  var grid = document.getElementById("calc-grid"); // optional: 100 squares
  var gridNote = document.getElementById("calc-grid-note");
  var run = document.getElementById("calc-run");
  if (!p || !n || !out || !odds) return;

  // Whole text must be a number: "1,500" reads as 1500, but "1,5", "1.5 times" or "12abc" are
  // refused rather than cut short (parseInt would read "1,500" as 1).
  function percent(s) {
    s = s.trim();
    return /^(\d+\.?\d*|\.\d+)$/.test(s) ? Number(s) : NaN;
  }
  function count(s) {
    s = s.trim();
    return /^(\d+|\d{1,3}(,\d{3})+)$/.test(s) ? Number(s.replace(/,/g, "")) : NaN;
  }

  // The page carries the 100 squares (shaded for 99%, 18 times) so the picture works without
  // JavaScript; the buttons stay hidden until this script can make them work.
  var squares = grid ? Array.prototype.slice.call(grid.querySelectorAll(".sq")) : [];
  if (grid && squares.length !== 100) throw new Error("calc: expected 100 squares in #calc-grid, found " + squares.length);
  if (run) run.hidden = false;
  document.querySelectorAll(".calc-presets").forEach(function (g) { g.hidden = false; });

  function shade(failed, label) {
    if (!grid) return;
    for (var i = 0; i < 100; i++) squares[i].classList.toggle("fail", failed[i]);
    var k = failed.filter(Boolean).length;
    grid.setAttribute("aria-label", label + ": " + k + " of 100 crews had at least one failure");
    if (gridNote) gridNote.textContent = label + ": " + k + " of 100 crews had at least one failure.";
  }

  var current = null; // { fail, ns, pv } for the numbers now shown

  function update() {
    var pv = percent(p.value);
    var ns = count(n.value);
    if (!(pv > 0 && pv < 100) || !(ns >= 1)) {
      out.textContent = "–";
      odds.textContent = "enter a percentage between 0 and 100 and a whole number of decisions";
      if (half) half.textContent = "–";
      current = null;
      if (run) run.disabled = true;
      if (grid) {
        squares.forEach(function (s) { s.classList.remove("fail"); });
        grid.setAttribute("aria-label", "no numbers to show");
        if (gridNote) gridNote.textContent = "–";
      }
      return;
    }
    // Work from the chance of failure each time, so many nines (99.999) keep their precision.
    var q = (100 - pv) / 100;
    // The first count at which failure is more likely than not (strictly above 50%).
    if (half) {
      var h = Math.floor(Math.log(0.5) / Math.log1p(-q)) + 1;
      half.textContent = h.toLocaleString("en-US");
      if (halfUnit) halfUnit.textContent = h === 1 ? "decision" : "decisions";
    }
    var fail = -Math.expm1(ns * Math.log1p(-q));
    var pct = fail * 100;
    // Rounding would show a near-certain failure as "100%", which reads as certain: from 99%
    // up, round down to a tenth, and above 99.9% say so.
    var shown = pct >= 99.95
      ? null
      : pct >= 99
        ? Math.floor(pct * 10) / 10
        : pct < 10
          ? Number(pct.toPrecision(2))
          : Math.round(pct);
    out.textContent = shown === null ? ">99.9%" : shown.toLocaleString("en-US") + "%";
    // The words follow the number shown, so "95%" never reads "about 9 chances in 10".
    // "One chance in N" only reads sensibly while failure is the less likely outcome; above
    // half, say it in tenths ("one chance in 1" was what 78% used to show).
    var shownFail = shown === null ? 1 : shown / 100;
    var oneIn = 1 / fail;
    odds.textContent = shownFail >= 0.95
      ? "close to certain"
      : shownFail >= 0.5
        ? "about " + Math.round(shownFail * 10) + " chances in 10"
        : "about one chance in " + (oneIn < 10 ? Math.round(oneIn) : Math.round(oneIn).toLocaleString("en-US"));

    current = { fail: fail };
    if (run) run.disabled = false;
    // The average outcome, rounded to whole crews.
    var k = Math.round(pct);
    var expected = squares.map(function (_, i) { return i < k; });
    shade(expected, "On average");
  }

  if (run) {
    run.addEventListener("click", function () {
      if (!current) return;
      var failed = squares.map(function () { return Math.random() < current.fail; });
      shade(failed, "One simulated run");
    });
  }

  document.querySelectorAll("[data-calc-p][data-calc-n]").forEach(function (b) {
    b.addEventListener("click", function () {
      p.value = b.getAttribute("data-calc-p");
      n.value = b.getAttribute("data-calc-n");
      update();
    });
  });

  p.addEventListener("input", update);
  n.addEventListener("input", update);
  update();
})();
