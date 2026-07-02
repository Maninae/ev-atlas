/* US tab: four state choropleths + a state detail panel. Selection state lives
   here; main.js just calls initUS(data) once the tab is first shown. */
import { Choropleth } from "./choropleth.js";
import { colorFn, legendHtml } from "./colors.js";
import { STATE_ABBREV } from "./states.js";
import { trendChart } from "./charts/trend.js";

// cost-to-charge assumptions (shown to the user in an (i) popover)
const KWH_PER_MI = 0.30, MPG = 30, GAS = 3.40;
// g CO₂/kWh, US grid average — EPA eGRID 2023 (~370) rising to ~386 (2024 release), we round to 380
const US_AVG_CO2 = 380;

const MAPS = [
  { el: "usmap-share",    key: "share",        metric: "share",    max: 25,  lo: "0%",  hi: "25%+", tip: (s) => `${s.share}% of new cars electric` },
  { el: "usmap-percap",   key: "evPer1k",      metric: "percap",   max: 35,  lo: "few", hi: "many", tip: (s) => `${s.evPer1k} EVs per 1,000 people` },
  { el: "usmap-charging", key: "portsPer100k", metric: "charging", max: 200, lo: "few", hi: "dense", tip: (s) => `${s.portsPer100k} charging ports per 100k` },
  { el: "usmap-clean",    key: "gridClean",    metric: "clean",    max: 100, lo: "0%",  hi: "100%", tip: (s) => `${s.gridClean}% clean grid` },
];

let US, maps = [], selected = null;

export function initUS(data) {
  US = data.usEv;
  const states = () => Object.keys(US).filter((x) => x !== "_meta");

  maps = MAPS.map((cfg) => new Choropleth(document.getElementById(cfg.el), {
    topo: data.usStates, objectName: "states", viewBox: [975, 610],
    metric: cfg.metric,
    idFor: (f) => STATE_ABBREV[f.properties.name] || null,
    nameFor: (f) => f.properties.name,
    valueFor: (ab) => (US[ab] ? US[ab][cfg.key] : null),
    colorFor: colorFn(cfg.metric, cfg.max),
    tipFor: (ab, name) => (US[ab] ? `<strong>${name}</strong><br>${cfg.tip(US[ab])}<br><span class="tip-cta">click to explore</span>` : null),
    legend: () => legendHtml(cfg.metric, cfg.lo, cfg.hi),
    onClick: (ab) => selectState(ab),
  }));

  // chips for all states (keyboard-accessible selection)
  const chipRow = document.getElementById("us-chips");
  chipRow.innerHTML = "";
  states().sort((a, b) => US[a].name.localeCompare(US[b].name)).forEach((ab) => {
    const b = document.createElement("button");
    b.className = "chip-mini"; b.textContent = US[ab].name;
    b.onclick = () => selectState(ab, true);
    chipRow.appendChild(b);
  });

  // search: state name or postal abbreviation
  const form = document.getElementById("us-search");
  form.onsubmit = (e) => {
    e.preventDefault();
    const q = document.getElementById("us-input").value.trim().toLowerCase();
    const err = document.getElementById("us-error");
    const clearSuggest = () => { const s = document.getElementById("us-suggest"); if (s) s.remove(); };
    if (!q) { err.textContent = ""; clearSuggest(); return; }
    if (US[q.toUpperCase()]) { selectState(q.toUpperCase(), true); return; }
    const exact = states().find((ab) => US[ab].name.toLowerCase() === q);
    if (exact) { selectState(exact, true); return; }
    const candidates = states().filter((ab) => {
      const n = US[ab].name.toLowerCase();
      return n.startsWith(q) || (q.length >= 3 && n.includes(q));
    });
    if (candidates.length === 1) { selectState(candidates[0], true); return; }
    if (candidates.length >= 2) {
      err.textContent = "Did you mean:";
      let row = document.getElementById("us-suggest");
      if (!row) {
        row = document.createElement("div");
        row.id = "us-suggest";
        row.className = "chip-row";
        row.style.marginTop = "10px";
        err.insertAdjacentElement("afterend", row);
      }
      row.innerHTML = "";
      candidates.slice(0, 6).forEach((ab) => {
        const b = document.createElement("button");
        b.className = "chip-mini"; b.textContent = US[ab].name;
        b.onclick = () => selectState(ab, true);
        row.appendChild(b);
      });
      return;
    }
    err.textContent = "Try a state name or two-letter code.";
    clearSuggest();
  };

  document.getElementById("us-input").addEventListener("input", () => {
    document.getElementById("us-error").textContent = "";
    const s = document.getElementById("us-suggest"); if (s) s.remove();
  });
}

export function refreshUS() { maps.forEach((m) => m.refresh()); }

function selectState(ab, scroll) {
  document.getElementById("us-error").textContent = "";
  const sug = document.getElementById("us-suggest"); if (sug) sug.remove();
  selected = ab;
  maps.forEach((m) => m.setSelected(ab, true));
  document.body.classList.add("bg-pulse");
  setTimeout(() => document.body.classList.remove("bg-pulse"), 600);
  const panel = document.getElementById("us-panel");
  panel.hidden = false;   // unhide BEFORE rendering so the trend chart measures real width
  renderPanel(ab);
  if (scroll) panel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function ord(n) { const s = ["th", "st", "nd", "rd"], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }

function cleanPhrase(p) {
  if (p >= 70) return "far cleaner than";
  if (p >= 45) return "cleaner than";
  if (p >= 30) return "about as clean as";
  return "dirtier than";
}

// prefer CO₂-ratio bucketing when the state has a disclosed g/kWh — the phrase
// sits next to that number, so it must be consistent with it (WY at 826 g/kWh
// is "far dirtier than" the ~380 g/kWh US average even though 30% of its power
// is clean). Falls back to cleanPhrase(percent-clean) when co2 is missing.
function co2Phrase(co2) {
  const r = co2 / US_AVG_CO2;
  if (r <= 0.4)  return "far cleaner than";
  if (r <= 0.85) return "cleaner than";
  if (r <  1.15) return "about as clean as";
  if (r <  2)    return "dirtier than";
  return "far dirtier than";
}

function renderPanel(ab) {
  const s = US[ab], meta = US._meta;
  const evCost = KWH_PER_MI * s.resPrice;   // $/100mi: 30 kWh × cents/kWh ÷ 100
  const gasCost = (100 / MPG * GAS);
  const cleanT = s.gridCleanThen, cleanN = s.gridClean;
  const trendPhrase =
    cleanN >= cleanT + 0.5 ? `up from ${cleanT}% in 2001` :
    cleanN <= cleanT - 0.5 ? `down from ${cleanT}% in 2001` :
    `steady near ${cleanT}% since 2001`;
  const co2Clause = s.co2 ? ` and runs about <strong>${Math.round(s.co2)} g CO₂ per kWh</strong>,` : "";
  const panel = document.getElementById("us-panel");

  panel.innerHTML = `
    <div class="region-header">
      <p class="kicker">United States · ${meta.shareYear}</p>
      <h2>${s.name}</h2>
      <p class="region-sub">${s.name} ranks <strong>${ord(s.shareRank)}</strong> for EV adoption — about
        <strong>${s.share}%</strong> of new cars here are electric${s.shareEstimated ? ' <button type="button" class="info-btn" data-info="est" aria-label="estimate">i</button>' : ""},
        and <strong>${s.evStock.toLocaleString()}</strong> are already on the road.</p>
    </div>
    <div class="ev-grid">
      <div class="card card--share">
        <h3>Going electric</h3>
        <div class="big-stat"><span class="num">${s.share}%</span><span class="unit">of new cars<br>are electric</span></div>
        <span class="rank-pill">${ord(s.shareRank)} of ${meta.count} states</span>
        ${s.shareEstimated ? '<p class="est-flag">estimated from state-level reporting</p>' : ""}
        <div class="kv-list">
          <div class="kv"><span class="k">EVs on the road</span><span class="v">${s.evStock.toLocaleString()}</span></div>
          <div class="kv kv--percap"><span class="k">per 1,000 people</span><span class="v">${s.evPer1k}</span></div>
          ${s.topModel ? `<div class="kv"><span class="k">most popular</span><span class="v">${s.topModel}</span></div>` : ""}
        </div>
      </div>

      <div class="card card--charging">
        <h3>Plugging in</h3>
        <div class="big-stat"><span class="num">${s.ports.toLocaleString()}</span><span class="unit">public<br>charging ports</span></div>
        <span class="rank-pill">${ord(s.portsPer100kRank)} per capita</span>
        <div class="kv-list">
          <div class="kv"><span class="k">ports per 100k people</span><span class="v">${s.portsPer100k}</span></div>
          <div class="kv"><span class="k">EVs per public port</span><span class="v">${s.ports ? Math.round(s.evStock / s.ports).toLocaleString() : "—"}</span></div>
        </div>
      </div>

      <div class="card card--cost">
        <h3>Cost to drive</h3>
        ${evCost < gasCost
          ? `<div class="big-stat"><span class="num">${Math.round((1 - evCost / gasCost) * 100)}%</span><span class="unit">cheaper to drive<br>on electricity</span></div>`
          : `<div class="big-stat"><span class="num">$${evCost.toFixed(2)}</span><span class="unit">to drive 100 mi<br>on electricity</span></div>`}
        <span class="rank-pill">per 100 miles <button type="button" class="info-btn" data-info="charge" aria-label="assumptions">i</button></span>
        <div class="charge-compare">
          <div class="cc ev"><div class="amt">$${evCost.toFixed(2)}</div><div class="lbl">electric · ${s.resPrice}¢/kWh</div></div>
          <div class="cc gas"><div class="amt">$${gasCost.toFixed(2)}</div><div class="lbl">gasoline · $${GAS}/gal</div></div>
        </div>
      </div>

      <div class="card card--clean wide">
        <h3>How clean is charging in ${s.name}?</h3>
        <p class="card-lead">An EV is only as clean as the grid that charges it. ${s.name}'s grid is
          <strong>${cleanN}% clean power</strong> today — ${trendPhrase} —${co2Clause} making charging here
          <strong>${s.co2 ? co2Phrase(s.co2) : cleanPhrase(cleanN)}</strong> the typical US grid.
          <a href="https://maninae.github.io/grid-atlas/#${ab}" target="_blank" rel="noopener">See the full grid →</a></p>
        <div id="us-clean-chart"></div>
      </div>
    </div>`;

  if (s.gridCleanSeries && window.d3) {
    // Match the clean-metric hue used by the map ramp / card accents so the
    // trend chart reads as "same idea, deeper view" — not a separate teal-accent
    // widget. trendChart already propagates `color` to line, area gradient stops,
    // last-point dot, and annotation label; no chart-side change needed.
    trendChart(document.getElementById("us-clean-chart"), {
      years: s.gridCleanSeries.years,
      series: [{ vals: s.gridCleanSeries.vals, color: "var(--m-clean)", area: true, label: cleanN + "%" }],
      yMax: 100, format: (v) => v + "%", height: 200,
    });
  }
}
