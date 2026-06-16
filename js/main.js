/* Boot + orchestration: load baked JSON, route the three tabs (lazy-init each on
   first view), theme toggle, info popovers. View modules own their own rendering. */
import { initUS, refreshUS } from "./us-view.js";
import { initWorld, refreshWorld } from "./world-view.js";
import { renderTimeline } from "./timeline.js";

const FILES = {
  usStates: "data/us-states.json", usEv: "data/us-ev.json",
  world110: "data/world-110m.json", worldEv: "data/world-ev.json",
  global: "data/global-summary.json", timeline: "data/timeline.json",
  battery: "data/battery-prices.json", evPrices: "data/ev-prices.json",
  callouts: "data/callouts.json",
};

const TABS = ["us", "world", "timeline"];
const inited = {};
let DATA = null;

async function boot() {
  try {
    const pairs = await Promise.all(Object.entries(FILES).map(
      ([k, u]) => fetch(u).then((r) => { if (!r.ok) throw new Error(u + " " + r.status); return r.json(); }).then((j) => [k, j])));
    DATA = Object.fromEntries(pairs);
  } catch (e) {
    const b = document.getElementById("boot-error");
    b.hidden = false; b.textContent = "Couldn't load data (" + e.message + "). Run from a local server, not file://.";
    return;
  }
  window.EVA = { bindInfo: () => {}, data: DATA };
  fillHero();
  setupTheme();
  setupInfo();
  setupTabs();
  document.body.classList.add("loaded");
}

function fillHero() {
  const ws = DATA.global.worldShareLatest;
  if (ws) {
    const el = document.querySelector('[data-fill="world-share-now"]');
    if (el) el.textContent = "1 in " + Math.round(100 / ws);
  }
  const us = DATA.worldEv.USA && DATA.worldEv.USA.shareLatest;
  if (us) {
    const el = document.querySelector('[data-fill="us-share-now"]');
    if (el) el.textContent = "1 in " + Math.round(100 / us);
  }
}

/* ---- tabs ---- */
function setupTabs() {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => { location.hash = btn.dataset.tab; });
  });
  window.addEventListener("hashchange", routeFromHash);
  routeFromHash();
}

function routeFromHash() {
  let name = (location.hash || "").replace("#", "");
  if (!TABS.includes(name)) name = "us";
  showTab(name);
}

function showTab(name) {
  TABS.forEach((t) => {
    document.getElementById("tab-" + t).classList.toggle("active", t === name);
    const btn = document.querySelector(`.tab-btn[data-tab="${t}"]`);
    if (btn) btn.classList.toggle("active", t === name);
  });
  window.scrollTo({ top: 0, behavior: "auto" });
  if (!inited[name]) {
    inited[name] = true;
    if (name === "us") initUS(DATA);
    else if (name === "world") initWorld(DATA);
    else if (name === "timeline") renderTimeline(document.getElementById("timeline-track"), DATA.timeline);
  }
}

/* ---- theme ---- */
function setupTheme() {
  const btn = document.getElementById("theme-toggle");
  const sync = () => { btn.textContent = document.documentElement.dataset.theme === "light" ? "🌙" : "☀️"; };
  sync();
  btn.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("eva-theme", next);
    sync();
    if (inited.us) refreshUS();
    if (inited.world) refreshWorld();
  });
}

/* ---- info popovers (event-delegated so dynamic panels work) ---- */
const INFO = {
  est: { h: "How we know", p: "The ~13 leading states are confirmed from the Alliance for Automotive Innovation's quarterly EV report. Other states are calibrated estimates from the same rankings. Charging-port counts (AFDC) and grid data (Grid Atlas) are exact.", a: ["Alliance for Automotive Innovation", "https://www.autosinnovate.org/GetConnected"] },
  charge: { h: "The cost math", p: "Assumes an EV uses 0.30 kWh per mile, charged at home at the state's average residential electricity price, versus a 30-mpg gasoline car at $3.40 per gallon. Public fast-charging costs more; gas prices vary by state.", a: null },
  kwh: { h: "What's a kilowatt-hour?", p: "A kilowatt-hour (kWh) is a unit of energy — running a 1,000-watt appliance for an hour. A typical EV travels 3–4 miles on one kWh.", a: ["Wikipedia", "https://en.wikipedia.org/wiki/Kilowatt-hour"] },
  electric: { h: "What counts as “electric”?", p: "Sales-share figures count both fully battery-electric cars (BEVs) and plug-in hybrids (PHEVs), following the IEA's definition, so every country is measured the same way. Sources that count BEVs only — as many national agencies do — will show lower numbers.", a: ["IEA Global EV Outlook", "https://www.iea.org/reports/global-ev-outlook-2025"] },
};

function setupInfo() {
  let pop = null;
  const close = () => { if (pop) { pop.remove(); pop = null; } };
  document.body.addEventListener("click", (e) => {
    const btn = e.target.closest(".info-btn");
    if (!btn) { if (!e.target.closest(".info-pop")) close(); return; }
    e.stopPropagation();
    const data = INFO[btn.dataset.info];
    if (!data) return;
    close();
    pop = document.createElement("div");
    pop.className = "info-pop";
    pop.innerHTML = `<h4>${data.h}</h4><p>${data.p}</p>` + (data.a ? `<a href="${data.a[1]}" target="_blank" rel="noopener">${data.a[0]} ↗</a>` : "");
    document.body.appendChild(pop);
    const r = btn.getBoundingClientRect();
    pop.style.left = Math.min(r.left + window.scrollX, window.innerWidth - 320) + "px";
    pop.style.top = (r.bottom + window.scrollY + 8) + "px";
    pop.style.maxWidth = "300px";
  });
}

boot();
