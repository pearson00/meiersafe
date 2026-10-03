// Cumulative failure: 1 - p^n. Invalid input shows a dash rather than a number.
(function () {
  var p = document.getElementById("calc-p");
  var n = document.getElementById("calc-n");
  var out = document.getElementById("calc-out");
  var odds = document.getElementById("calc-odds");
  if (!p || !n || !out || !odds) return;

  function update() {
    var pv = parseFloat(p.value);
    var ns = parseInt(n.value, 10);
    if (!(pv > 0 && pv < 100) || !(ns >= 1)) {
      out.textContent = "–";
      odds.textContent = "enter a percentage below 100 and a whole number of times";
      return;
    }
    // Work from the chance of failure each time, so many nines (99.999) keep their precision.
    var q = (100 - pv) / 100;
    var fail = -Math.expm1(ns * Math.log1p(-q));
    var pct = fail * 100;
    out.textContent = (pct < 10
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
