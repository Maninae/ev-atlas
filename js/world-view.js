/* The Planet tab: four world choropleths + country panel, plus the battery
   learning-curve chart, the three story callouts, and the cheapest-EV strip. */
import { Choropleth } from "./choropleth.js";
import { colorFn, legendHtml } from "./colors.js";
import { trendChart } from "./charts/trend.js";

const d3 = window.d3;

const MAPS = [
  { el: "worldmap-share",  key: "shareLatest", metric: "share",  max: 90,  lo: "0%",   hi: "90%+", tip: (c) => `${c.shareLatest}% of new cars electric` },
  { el: "worldmap-percap", key: "stockPer1k",  metric: "percap", max: 50,  lo: "few",  hi: "many", tip: (c) => `${c.stockPer1k} EVs per 1,000 people` },
  { el: "worldmap-clean",  key: "lowCarbon",   metric: "clean",  max: 100, lo: "0%",   hi: "100%", tip: (c) => `${c.lowCarbon}% low-carbon grid` },
  { el: "worldmap-growth", key: "growth",      metric: "growth", max: 12,  lo: "declining", hi: "surging", tip: (c) => `${c.growth > 0 ? "+" : ""}${c.growth} pts in a year` },
];

let WORLD, maps = [], selected = null;

export function initWorld(data) {
  WORLD = data.worldEv;

  maps = MAPS.map((cfg) => new Choropleth(document.getElementById(cfg.el), {
    topo: data.world110, objectName: "countries", viewBox: [960, 500],
    metric: cfg.metric,
    projection: d3.geoNaturalEarth1(),
    idFor: (f) => f.id || null,
    nameFor: (f) => (f.properties && f.properties.name) || "",
    valueFor: (a3) => { const c = WORLD[a3]; return c && c[cfg.key] != null ? c[cfg.key] : null; },
    colorFor: colorFn(cfg.metric, cfg.max),
    tipFor: (a3, name) => { const c = WORLD[a3]; return c && c[cfg.key] != null ? `<strong>${name}</strong><br>${cfg.tip(c)}<br><span class="tip-cta">click to explore</span>` : null; },
    legend: () => legendHtml(cfg.metric, cfg.lo, cfg.hi),
    onClick: (a3) => selectCountry(a3),
  }));

  // callouts
  const co = document.getElementById("world-callouts");
  co.innerHTML = "";
  data.callouts.forEach((c) => {
    const d = document.createElement("div");
    d.className = "callout";
    d.innerHTML = `<div class="co-flag">${c.flag}</div><h3>${c.title}</h3><p>${c.body}</p><div class="co-stat">${c.stat}</div>`;
    co.appendChild(d);
  });

  // battery learning curve
  const bp = data.battery;
  trendChart(document.getElementById("battery-chart"), {
    years: bp.years,
    series: [{ vals: bp.vals, color: "var(--accent)", area: true, label: "$" + bp.vals[bp.vals.length - 1] }],
    yMax: 1250, format: (v) => "$" + v, height: 260,
  });
  const bc = document.getElementById("battery-chart");
  const cap = document.createElement("p");
  cap.className = "card-lead"; cap.style.marginTop = "10px";
  cap.innerHTML = `Lithium-ion battery packs fell from <strong>$${bp.vals[0]}</strong> to <strong>$${bp.vals[bp.vals.length - 1]} per kWh</strong> — a ${Math.round((1 - bp.vals[bp.vals.length - 1] / bp.vals[0]) * 100)}% drop that made affordable EVs possible. <span class="est-flag">${bp.source}</span>`;
  bc.appendChild(cap);

  // cheapest strip
  const strip = document.getElementById("cheapest-strip");
  strip.innerHTML = "";
  data.evPrices.cheapest.forEach((m) => {
    const d = document.createElement("div");
    d.className = "cheap-card";
    d.innerHTML = `<div class="cc-price">$${m.priceUSD.toLocaleString()}</div><div class="cc-model">${m.model}</div><div class="cc-where">${m.where} · ${m.note}</div>`;
    strip.appendChild(d);
  });
  const note = document.createElement("p");
  note.className = "est-flag"; note.style.cssText = "max-width:1000px;margin:10px auto 0;text-align:center";
  note.textContent = "Approximate starting prices for the cheapest trims — they vary by market and year.";
  strip.after(note);

  // search
  const form = document.getElementById("world-search");
  form.onsubmit = (e) => {
    e.preventDefault();
    const q = document.getElementById("world-input").value.trim().toLowerCase();
    const err = document.getElementById("world-error");
    const hit = Object.keys(WORLD).find((a3) => WORLD[a3].name.toLowerCase() === q) ||
                Object.keys(WORLD).find((a3) => WORLD[a3].name.toLowerCase().startsWith(q) && q.length >= 3);
    if (hit) { err.textContent = ""; selectCountry(hit, true); }
    else err.textContent = "Try a country name.";
  };
}

export function refreshWorld() {
  maps.forEach((m) => m.refresh());
  // battery chart uses CSS vars, no re-render needed
}

function cleanPhrase(p) {
  if (p == null) return "";
  if (p >= 80) return "almost entirely clean";
  if (p >= 50) return "mostly clean";
  if (p >= 30) return "partly clean";
  return "still mostly fossil";
}

function selectCountry(a3, scroll) {
  const c = WORLD[a3];
  if (!c) return;
  selected = a3;
  maps.forEach((m) => m.setSelected(a3, true));
  const panel = document.getElementById("world-panel");
  const hasShare = c.salesShare && c.salesShare.vals.length;

  panel.innerHTML = `
    <div class="region-header">
      <p class="kicker">${c.region}</p>
      <h2>${c.name}</h2>
      ${c.story ? `<p class="region-sub">${c.story}</p>` : ""}
    </div>
    <div class="ev-grid">
      <div class="card ${hasShare ? "wide" : ""}">
        <h3>Share of new cars that are electric</h3>
        ${c.shareLatest != null
          ? `<div class="big-stat"><span class="num">${c.shareLatest}%</span><span class="unit">of new cars<br>are electric (2024)</span></div>`
          : `<p class="card-lead">No country-level EV sales data is published for ${c.name}.</p>`}
        ${hasShare ? '<div id="world-share-chart"></div>' : ""}
      </div>
      <div class="card">
        <h3>On the road</h3>
        ${c.stock != null ? `<div class="big-stat"><span class="num">${(c.stock / 1e6 >= 1 ? (c.stock / 1e6).toFixed(1) + "M" : (c.stock / 1e3).toFixed(0) + "k")}</span><span class="unit">electric cars<br>in the fleet</span></div>` : '<p class="card-lead">—</p>'}
        ${c.stockPer1k != null ? `<div class="kv"><span class="k">per 1,000 people</span><span class="v">${c.stockPer1k}</span></div>` : ""}
        ${c.salesLatest != null ? `<div class="kv"><span class="k">sold in 2024</span><span class="v">${c.salesLatest.toLocaleString()}</span></div>` : ""}
      </div>
      <div class="card">
        <h3>How clean is the grid?</h3>
        ${c.lowCarbon != null
          ? `<div class="big-stat"><span class="num">${c.lowCarbon}%</span><span class="unit">low-carbon<br>electricity</span></div>
             <p class="card-lead" style="margin-top:8px">An EV charged in ${c.name} runs on power that's <strong>${cleanPhrase(c.lowCarbon)}</strong>.</p>`
          : '<p class="card-lead">No grid data available.</p>'}
      </div>
    </div>`;

  panel.hidden = false;   // unhide BEFORE charting so the chart measures real width
  if (hasShare && window.d3) {
    const peak = Math.max.apply(null, c.salesShare.vals.filter((v) => v != null).concat(c.shareLatest || 0));
    trendChart(document.getElementById("world-share-chart"), {
      years: c.salesShare.years,
      series: [{ vals: c.salesShare.vals, color: "var(--accent)", area: true, label: (c.shareLatest != null ? c.shareLatest : peak) + "%" }],
      yMax: Math.max(20, Math.ceil(peak / 10) * 10 + 5), format: (v) => v + "%", height: 200,
    });
  }
  document.body.classList.add("bg-pulse");
  setTimeout(() => document.body.classList.remove("bg-pulse"), 600);
  if (scroll) panel.scrollIntoView({ behavior: "smooth", block: "start" });
}
