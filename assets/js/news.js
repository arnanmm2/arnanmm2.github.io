/* ============================================================
   News page — Inversa-inspired scrollytelling interactions
   GitHub Pages-safe vanilla JS, no build step. Loaded after main.js.
   ============================================================ */
(function () {
  "use strict";

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function cssVar(name) { return getComputedStyle(document.body).getPropertyValue(name).trim(); }

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Lenis inertial smooth scroll (MIT, optional) ----------
     This is what gives the page its weighted, eased scroll feel rather
     than the OS's abrupt native scroll. If the CDN script is unavailable
     — or the visitor prefers reduced motion — everything below still
     works on plain native scrolling. */
  var lenis = null;
  if (typeof window.Lenis === "function" && !reduceMotion) {
    try {
      lenis = new window.Lenis({
        duration: 1.05,
        easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
        smoothWheel: true,
        touchMultiplier: 1.6
      });
      var rafLoop = function (time) { lenis.raf(time); requestAnimationFrame(rafLoop); };
      requestAnimationFrame(rafLoop);
      // Keep scroll-driven work on Lenis' own tick so it stays in sync.
      lenis.on("scroll", function () { onScrollTick(); });
      // Chapter-index links must route through Lenis, not native anchor jumps.
      $$('a[href^="#"]').forEach(function (a) {
        a.addEventListener("click", function (e) {
          var target = document.querySelector(a.getAttribute("href"));
          if (!target) return;
          e.preventDefault();
          lenis.scrollTo(target, { offset: -70 });
        });
      });
    } catch (err) { lenis = null; }
  }

  /* Scroll-driven subscribers: each gets called on every scroll frame.
     Registered by the scrub/parallax code further down. */
  var scrollSubscribers = [];
  var scrollFrame = 0;
  function onScrollTick() {
    if (scrollFrame) return;
    scrollFrame = requestAnimationFrame(function () {
      scrollFrame = 0;
      for (var i = 0; i < scrollSubscribers.length; i++) scrollSubscribers[i]();
    });
  }
  if (!lenis) {
    window.addEventListener("scroll", onScrollTick, { passive: true });
  }
  window.addEventListener("resize", onScrollTick);

  /* ---------- Reading progress ---------- */
  (function () {
    var bar = $("[data-read-progress] span");
    if (!bar) return;
    function update() {
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      bar.style.transform = "scaleX(" + (max > 0 ? Math.min(1, h.scrollTop / max) : 0).toFixed(4) + ")";
    }
    scrollSubscribers.push(update);
    update();
  })();

  /* ---------- Live WIB clock ---------- */
  function tickClock() {
    var el = $("[data-live-date]");
    if (!el) return;
    var now = new Date();
    var d = now.toLocaleDateString("en-GB", { timeZone: "Asia/Jakarta", weekday: "short", day: "numeric", month: "short", year: "numeric" });
    var t = now.toLocaleTimeString("en-GB", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit" });
    el.textContent = d + " · " + t + " WIB";
  }
  tickClock();
  setInterval(tickClock, 30000);

  /* ---------- Generic story-step scrollytelling binder ---------- */
  function bindNewsStory(root, onActive) {
    var steps = $$(".n-step", root);
    var progress = $("[data-story-progress]", root);
    var dots = [];
    var active = -1;
    var manualUntil = 0;

    if (progress && steps.length) {
      steps.forEach(function (step, i) {
        var dot = document.createElement("i");
        var fill = document.createElement("b");
        dot.appendChild(fill);
        dot.addEventListener("click", function () {
          manualUntil = Date.now() + 700;
          // Lenis owns the scroll position while active — a native
          // scrollIntoView would be immediately undone by its RAF loop.
          if (lenis) lenis.scrollTo(step, { offset: -(window.innerHeight / 2) + (step.offsetHeight / 2) });
          else step.scrollIntoView({ behavior: "smooth", block: "center" });
          activate(i);
        });
        progress.appendChild(dot);
        dots.push(dot);
      });
    }

    function activate(index) {
      if (index < 0 || index >= steps.length || index === active) return;
      active = index;
      steps.forEach(function (step, i) { step.classList.toggle("is-active", i === index); });
      dots.forEach(function (dot, i) {
        dot.classList.toggle("active", i === index);
        dot.classList.toggle("done", i < index);
      });
      onActive(steps[index], index);
    }

    activate(0);

    if ("IntersectionObserver" in window && steps.length) {
      var io = new IntersectionObserver(function (entries) {
        if (Date.now() < manualUntil) return;
        entries.forEach(function (entry) {
          if (entry.isIntersecting) activate(steps.indexOf(entry.target));
        });
      }, { threshold: 0, rootMargin: "-40% 0px -40% 0px" });
      steps.forEach(function (step) { io.observe(step); });
    }

    /* ---- Continuous scrub ----
       Discrete step activation (above) swaps the content; this adds the
       motion *between* steps that makes the panel feel attached to the
       scroll rather than snapping. Two channels:
         --scrub  0..1 progress through the whole story  (slow photo drift)
         --local  0..1 progress within the current step  (fill, micro-shift)
       Both are plain CSS custom properties, so the styling stays in CSS. */
    var stage = $(".n-stage", root);
    var progressFill = $("[data-scrub-fill]", root);
    if (stage && !reduceMotion) {
      var scrub = function () {
        var rect = root.getBoundingClientRect();
        var vh = window.innerHeight || 1;
        var span = rect.height - vh;
        var p = span > 0 ? (-rect.top) / span : 0;
        p = Math.max(0, Math.min(1, p));
        stage.style.setProperty("--scrub", p.toFixed(4));

        if (steps.length) {
          var stepsSpan = 1 / steps.length;
          var within = (p % stepsSpan) / stepsSpan;
          stage.style.setProperty("--local", (isFinite(within) ? within : 0).toFixed(4));
          if (progressFill) progressFill.style.transform = "scaleX(" + p.toFixed(4) + ")";
        }
      };
      scrollSubscribers.push(scrub);
      scrub();
    }

    root.classList.add("is-loaded");
  }

  function tweenText(el, newVal) {
    if (!el) return;
    el.style.transition = "opacity .15s";
    el.style.opacity = 0;
    setTimeout(function () {
      el.textContent = newVal || "";
      el.style.opacity = 1;
    }, 150);
  }

  function wireKpiStory(rootSelector) {
    var root = $(rootSelector);
    if (!root) return;
    var counter = $("[data-w-counter]", root);
    var badge = $("[data-w-badge]", root);
    var photos = $$(".n-stage-photo img", root);
    var credit = $("[data-w-credit]", root);
    var total = $$(".n-step", root).length;
    bindNewsStory(root, function (step, index) {
      var kpi = $("[data-w-kpi]", root);
      var label = $("[data-w-label]", root);
      var note = $("[data-w-note]", root);
      tweenText(kpi, step.getAttribute("data-kpi"));
      tweenText(label, step.getAttribute("data-label"));
      tweenText(note, step.getAttribute("data-note"));
      tweenText(credit, step.getAttribute("data-credit"));
      if (counter) counter.textContent = String(index + 1).padStart(2, "0");
      if (photos.length) {
        photos.forEach(function (p) { p.classList.toggle("on", +p.getAttribute("data-step") === index); });
      }
    });
  }
  wireKpiStory("[data-mbg-story]");
  wireKpiStory("[data-currency-story]");
  wireKpiStory("[data-markets-story]");
  wireKpiStory("[data-dots-story]");

  /* ---------- Currency converter ---------- */
  var RATES = { IDR: 1, USD: 17879, EUR: 20668, SGD: 13989, JPY: 113.30, AUD: 12636 };
  var cvAmount = $("#cvAmount"), cvFrom = $("#cvFrom"), cvTo = $("#cvTo"), cvOut = $("#cvOut");
  function fmt(n, cur) {
    var dec = cur === "IDR" ? 0 : 2;
    return new Intl.NumberFormat("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(n);
  }
  function convert() {
    if (!cvAmount || !cvFrom || !cvTo || !cvOut) return;
    var amt = parseFloat(cvAmount.value) || 0;
    var from = cvFrom.value, to = cvTo.value;
    var res = amt * RATES[from] / RATES[to];
    cvOut.innerHTML = fmt(amt, from) + " " + from + " =<b>" + fmt(res, to) + " " + to + "</b>";
  }
  [cvAmount, cvFrom, cvTo].forEach(function (el) { if (el) el.addEventListener("input", convert); });
  var swapBtn = $("#swapBtn");
  if (swapBtn) swapBtn.addEventListener("click", function () {
    var a = cvFrom.value; cvFrom.value = cvTo.value; cvTo.value = a; convert();
  });
  convert();

  /* ---------- Rupiah strength gauge ---------- */
  (function () {
    var ytd = -7.3;
    var pct = Math.max(2, Math.min(98, (ytd + 15) / 30 * 100));
    var mark = $("#newsGaugeMark");
    if (mark) mark.style.left = pct + "%";
  })();

  /* ---------- Bitcoin: live via Binance (offline fallback) ---------- */
  var btc = {
    price: 65228, chg: 0.79, high: 65286, low: 64723, vol: 30600000000, live: false,
    closes: [60920, 61780, 62650, 63400, 63980, 64550, 65120, 65480, 65210, 64680, 64210, 64790, 64938, 65074, 65228],
    labels: []
  };
  (function () {
    var n = btc.closes.length, t = new Date();
    for (var i = n - 1; i >= 0; i--) {
      var d = new Date(t); d.setDate(t.getDate() - i);
      btc.labels.push(d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }));
    }
  })();

  function renderBTC() {
    var up = btc.chg >= 0;
    var priceEl = $("#btcPrice");
    if (priceEl) priceEl.textContent = "$" + btc.price.toLocaleString("en-US", { maximumFractionDigits: 0 });
    var chgEl = $("#btcChg");
    if (chgEl) {
      chgEl.textContent = (up ? "▲ +" : "▼ ") + btc.chg.toFixed(2) + "% (24h)";
      chgEl.style.color = up ? "var(--n-accent-ink)" : "var(--n-warn)";
    }
    var idrEl = $("#btcIdr");
    if (idrEl) idrEl.textContent = "≈ Rp " + Math.round(btc.price * RATES.USD).toLocaleString("id-ID");
    var hlEl = $("#btcHL");
    if (hlEl) hlEl.textContent = "$" + btc.high.toLocaleString("en-US", { maximumFractionDigits: 0 }) + " / $" + btc.low.toLocaleString("en-US", { maximumFractionDigits: 0 });
    var volEl = $("#btcVol");
    if (volEl) volEl.textContent = "$" + (btc.vol / 1e9).toFixed(1) + "B";
    var badge = $("#btcBadge");
    if (badge) {
      badge.className = "n-stage-badge" + (btc.live ? " on" : "");
      badge.innerHTML = "<i></i>" + (btc.live ? "Live · Binance" : "Offline snapshot");
    }
  }

  function initBTC() {
    var hosts = ["https://api.binance.com", "https://data-api.binance.vision"];
    (function tryHost(i) {
      if (i >= hosts.length) { renderBTC(); buildCharts(); return; }
      Promise.all([
        fetch(hosts[i] + "/api/v3/ticker/24hr?symbol=BTCUSDT").then(function (r) { if (!r.ok) throw new Error("bad"); return r.json(); }),
        fetch(hosts[i] + "/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=30").then(function (r) { if (!r.ok) throw new Error("bad"); return r.json(); })
      ]).then(function (res) {
        var t = res[0], k = res[1];
        btc.price = +t.lastPrice; btc.chg = +t.priceChangePercent; btc.high = +t.highPrice; btc.low = +t.lowPrice; btc.vol = +t.quoteVolume;
        btc.closes = k.map(function (c) { return +c[4]; });
        btc.labels = k.map(function (c) { var d = new Date(c[0]); return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }); });
        btc.live = true;
        renderBTC(); buildCharts();
      }).catch(function () { tryHost(i + 1); });
    })(0);
  }

  /* ---------- Theme-aware (dark-only) Chart.js charts ---------- */
  var chart1 = null, chart2 = null, chart3 = null;
  function buildCharts() {
    if (typeof Chart === "undefined") return;
    var ink = "#f0eee7", sub = "#a9a59b", line = "rgba(240,238,231,.10)";
    var acc = "#8fe0c4", acc2 = "#e0a06a";
    Chart.defaults.color = sub;
    Chart.defaults.font.family = "-apple-system, 'Helvetica Neue', sans-serif";

    var labels = ["24 Jul", "27 Jul", "28 Jul", "29 Jul", "30 Jul", "31 Jul", "3 Aug", "4 Aug", "5 Aug", "6 Aug", "7 Aug", "10 Aug"];
    var usd = [17845, 17862, 17870, 17858, 17875, 17890, 18047, 17960, 17920, 17919, 17795, 17879];
    var eur = [20629, 20649, 20658, 20644, 20664, 20681, 20862, 20762, 20716, 20714, 20567, 20668];
    var sgd = [13964, 13977, 13983, 13974, 13987, 13999, 14122, 14054, 14023, 14022, 13925, 13989];
    function idx(a) { return a.map(function (v) { return +(v / a[0] * 100).toFixed(2); }); }

    var usdCanvas = $("#usdIdrChart");
    if (usdCanvas) {
      if (chart1) chart1.destroy();
      chart1 = new Chart(usdCanvas, {
        type: "line",
        data: { labels: labels, datasets: [{ label: "USD / IDR", data: usd, borderColor: acc, backgroundColor: "transparent", tension: .34, pointRadius: 4, pointBackgroundColor: acc, borderWidth: 2.5 }] },
        options: { responsive: true, plugins: { legend: { labels: { color: ink } }, title: { display: true, text: "USD/IDR — last two weeks (rising = rupiah weakening)", color: ink, font: { size: 13, weight: "600" } } }, scales: { x: { grid: { color: line }, ticks: { color: sub } }, y: { grid: { color: line }, ticks: { color: sub, callback: function (v) { return "Rp " + v.toLocaleString("id-ID"); } } } } }
      });
    }

    var crossCanvas = $("#crossChart");
    if (crossCanvas) {
      if (chart2) chart2.destroy();
      chart2 = new Chart(crossCanvas, {
        type: "line",
        data: { labels: labels, datasets: [
          { label: "vs USD", data: idx(usd), borderColor: acc, backgroundColor: "transparent", tension: .34, pointRadius: 3, borderWidth: 2.5 },
          { label: "vs EUR", data: idx(eur), borderColor: acc2, backgroundColor: "transparent", tension: .34, pointRadius: 3, borderWidth: 2.5 },
          { label: "vs SGD", data: idx(sgd), borderColor: "#8fb9c9", backgroundColor: "transparent", tension: .34, pointRadius: 3, borderWidth: 2.5 }
        ] },
        options: { responsive: true, plugins: { legend: { labels: { color: ink } }, title: { display: true, text: "Rupiah vs major currencies — indexed to 24 Jul = 100", color: ink, font: { size: 13, weight: "600" } } }, scales: { x: { grid: { color: line }, ticks: { color: sub } }, y: { grid: { color: line }, ticks: { color: sub } } } }
      });
    }

    var btcCanvas = $("#btcChart");
    if (btcCanvas) {
      var btcUp = btc.chg >= 0;
      if (chart3) chart3.destroy();
      chart3 = new Chart(btcCanvas, {
        type: "line",
        data: { labels: btc.labels, datasets: [{ label: "BTC / USD daily close", data: btc.closes, borderColor: btcUp ? acc : acc2, backgroundColor: "transparent", tension: .3, pointRadius: 0, borderWidth: 2.5 }] },
        options: { responsive: true, plugins: { legend: { labels: { color: ink } }, title: { display: true, text: "Bitcoin (BTCUSDT) — last " + btc.closes.length + " daily closes" + (btc.live ? " · live via Binance" : " · offline snapshot"), color: ink, font: { size: 13, weight: "600" } } }, scales: { x: { grid: { color: line }, ticks: { color: sub, maxTicksLimit: 8 } }, y: { grid: { color: line }, ticks: { color: sub, callback: function (v) { return "$" + (v / 1000).toFixed(0) + "k"; } } } } }
      });
    }
  }

  /* ---------- Fact-check helper ---------- */
  window.runNewsFactCheck = function () {
    var input = $("#fc-url");
    var box = $("#fc-result");
    if (!input || !box) return;
    var url = input.value.trim();
    if (!url) { box.innerHTML = "⚠️ Please paste a URL first."; box.classList.add("show"); return; }
    var host = "";
    try { host = new URL(url).hostname.replace("www.", ""); } catch (e) { host = "(unrecognized URL format)"; }
    box.innerHTML =
      "<b>Captured URL:</b> " + url + "<br><b>Source domain:</b> " + host + "<br><br>" +
      "This static page can't fetch and cross-check the article against live data by itself. Here's the verification path used for every item in this briefing:" +
      '<ol style="margin:10px 0 0 18px;padding:0;">' +
      "<li>Extract the checkable claims (numbers, dates, names, quotes).</li>" +
      "<li>Identify the primary source (BMKG for quakes, BI for FX, BPS/BLS for inflation, exchanges for index levels).</li>" +
      "<li>Compare the article's figures to the primary source's own published data.</li>" +
      "<li>Note agreement across independent outlets, or flag a lone uncorroborated figure.</li>" +
      "<li>Conclude Verified, Plausible/consistent, or Unverified/contradicted — reasoning shown, not just a verdict.</li>" +
      "</ol>";
    box.classList.add("show");
  };

  /* ---------- Bookmarks (lightweight, per-card) ---------- */
  var saved = new Set(JSON.parse(localStorage.getItem("savedNews") || "[]"));
  function slug(s) { return (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60); }
  $$(".n-card").forEach(function (card) {
    var h = card.querySelector("h3");
    if (!h) return;
    var id = slug(h.textContent);
    card.dataset.nid = id;
    var bk = document.createElement("button");
    bk.className = "n-bk" + (saved.has(id) ? " saved" : "");
    bk.type = "button";
    bk.innerHTML = saved.has(id) ? "★" : "☆";
    bk.setAttribute("aria-label", "Save this story");
    bk.addEventListener("click", function (e) {
      e.preventDefault(); e.stopPropagation();
      if (saved.has(id)) { saved.delete(id); bk.classList.remove("saved"); bk.innerHTML = "☆"; }
      else { saved.add(id); bk.classList.add("saved"); bk.innerHTML = "★"; }
      localStorage.setItem("savedNews", JSON.stringify(Array.from(saved)));
    });
    var media = card.querySelector(".n-card-media") || card;
    media.appendChild(bk);
  });

  /* ---------- Global search across the news grid ---------- */
  var searchInput = $("#newsSearch");
  if (searchInput) {
    searchInput.addEventListener("input", function () {
      var q = searchInput.value.toLowerCase().trim();
      $$(".n-card").forEach(function (card) {
        var match = !q || card.textContent.toLowerCase().indexOf(q) !== -1;
        card.style.display = match ? "" : "none";
      });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "/" && document.activeElement !== searchInput) { e.preventDefault(); searchInput.focus(); }
      if (e.key === "Escape" && document.activeElement === searchInput) { searchInput.value = ""; searchInput.dispatchEvent(new Event("input")); searchInput.blur(); }
    });
  }

  /* ---------- Init ---------- */
  renderBTC();
  document.addEventListener("DOMContentLoaded", function () {
    buildCharts();
    initBTC();
    setInterval(function () { if (btc.live) initBTC(); }, 60000);
  });
})();
