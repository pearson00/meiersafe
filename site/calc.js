// Cumulative failure: 1 - p^n. Invalid input shows a dash rather than a number.
(function () {
  var p = document.getElementById("calc-p");
  var n = document.getElementById("calc-n");
  var out = document.getElementById("calc-out");
  var odds = document.getElementById("calc-odds");
  var half = document.getElementById("calc-half"); // optional: decisions until failure passes 50%
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

  function update() {
    var pv = percent(p.value);
    var ns = count(n.value);
    if (!(pv > 0 && pv < 100) || !(ns >= 1)) {
      out.textContent = "–";
      odds.textContent = "enter a percentage below 100 and a whole number of times";
      if (half) half.textContent = "–";
      return;
    }
    // Work from the chance of failure each time, so many nines (99.999) keep their precision.
    var q = (100 - pv) / 100;
    if (half) half.textContent = Math.ceil(Math.log(0.5) / Math.log1p(-q)).toLocaleString("en-US");
    var fail = -Math.expm1(ns * Math.log1p(-q));
    var pct = fail * 100;
    // Rounding would show a near-certain failure as "100%", which reads as certain.
    out.textContent = pct >= 99.95
      ? ">99.9%"
      : (pct < 10
        ? pct.toLocaleString("en-US", { maximumSignificantDigits: 2 })
        : Math.round(pct)) + "%";
    var oneIn = 1 / fail;
    odds.textContent = oneIn < 1.05
      ? "close to certain"
      : "about one chance in " + (oneIn < 10 ? Math.round(oneIn) : Math.round(oneIn).toLocaleString("en-US"));
  }

  p.addEventListener("input", update);
  n.addEventListener("input", update);
  update();
})();
