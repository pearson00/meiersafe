// Cumulative failure: 1 - p^n. Invalid input shows a dash rather than a number.
(function () {
  var p = document.getElementById("calc-p");
  var n = document.getElementById("calc-n");
  var out = document.getElementById("calc-out");
  var odds = document.getElementById("calc-odds");
  if (!p || !n || !out || !odds) return;

  function update() {
    var ps = parseFloat(p.value) / 100;
    var ns = parseInt(n.value, 10);
    if (!(ps > 0 && ps < 1) || !(ns >= 1)) {
      out.textContent = "–";
      odds.textContent = "enter a percentage below 100 and a whole number of times";
      return;
    }
    var fail = 1 - Math.pow(ps, ns);
    var pct = fail * 100;
    out.textContent = (pct < 1 ? pct.toFixed(1) : Math.round(pct)) + "%";
    var oneIn = 1 / fail;
    odds.textContent = oneIn < 1.05
      ? "close to certain"
      : "about one chance in " + (oneIn < 10 ? Math.round(oneIn) : Math.round(oneIn).toLocaleString());
  }

  p.addEventListener("input", update);
  n.addEventListener("input", update);
  update();
})();
