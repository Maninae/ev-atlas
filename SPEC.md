# EV Atlas — design spec (source of truth)

A data-journalism site about the **global switch to electric cars** — sibling to
Grid Atlas, same "Evergreen" aesthetic. Answers: *how fast is the world going
electric, and what does it mean where you live?*

- **New public repo** `Maninae/ev-atlas` → `maninae.github.io/ev-atlas`; linked from the maninae projects page.
- **Local:** `~/Developer/ev-atlas`. No framework, no bundler. ES modules + D3 v7 + topojson from jsDelivr.
- **All data baked to static JSON** by a Python `build/` pipeline. Zero runtime API calls (same philosophy as Grid Atlas).
- Audience: general US public. Copy is plain-language (~5th-grade), `(i)` popovers for depth, never repeat a point.

## Three tabs (hash routing in ONE index.html: `#us` default · `#world` · `#timeline`)

Shared sticky topbar: brand · tab nav · search · theme toggle. Each tab is a
`<section>` toggled by `main.js`; only the active tab's charts render/animate.

### Tab 1 — United States (`#us`) — Grid-Atlas-style
- Hero stat: e.g. "~10% of new US cars are electric, up from ~1% a decade ago."
- **2×2 US choropleth small-multiples** (reuse Grid Atlas `usmap.js`), one per metric:
  1. EV share of new-car registrations (latest)
  2. EVs per 1,000 people
  3. Public charging ports per capita
  4. **Grid cleanliness** — clean % of that state's grid (from Grid Atlas) → "how green is charging here"
- Click a state / search → **state panel**:
  - Big adoption stat + **trend line** (EV share or registrations over time)
  - Charging infrastructure count
  - **"Your grid is X% clean and trending ↑"** + electricity price → **cost-to-charge vs a tank of gas** (Grid Atlas cross-link)
  - Top-selling EV model, key state incentive, a one-line story fact
- Honest-granularity note (registrations = cumulative stock, not flow, etc.).

### Tab 2 — The Planet (`#world`)
- Hero stat: e.g. "1 in 5 new cars sold worldwide is electric — China and Europe lead, and the Global South is electrifying two & three wheels."
- **2×2 world choropleth small-multiples** (new `worldmap.js`, countries topojson):
  1. EV sales share (% of new cars, latest)
  2. EV stock per capita
  3. Grid low-carbon %
  4. YoY growth (or electric 2/3-wheeler share)
- Click a country → **country panel**: sales-share trend, stock, grid low-carbon %, story snippet.
- **Special callouts** (curated cards): China (the giant + BYD), Norway (the leader, ~90%+), the **Global South 2/3-wheeler story** (India e-rickshaws, Nepal hydro-EVs, Africa e-motos) — the need-driven adoption Owen specifically wants featured.

### Tab 3 — The Timeline (`#timeline`) — museum scrollytelling
- A **center vertical line**; scrolling down travels through time. Nodes alternate left/right: year · title · 1-3 sentence story · optional stat/image. ~32–40 events, **1830s → 2025**.
- Eras color-banded: early-electric (1830–1910) → gas takeover (1908–1930) → dark age (1930–1990) → revival (1990–2008) → Tesla era (2008–2020) → mainstream (2020–2025).
- Must start before Tesla: Anderson/Davenport carriages, Planté battery, 1900 "38% electric" peak, Model T + Kettering starter killing EVs, the Edison–Ford electric car, EV1 + "Who Killed the Electric Car?", then Roadster→Leaf→Model 3→BYD.

## Shared "by the numbers" elements
- **Battery $/kWh learning curve** (2010→2024, BNEF) — a hero chart (world tab + timeline finale).
- **EV vs ICE average price** convergence; cheapest-EVs strip (BYD Seagull, Wuling Mini EV, Dacia Spring, Tata).

## Data files (`data/`, all baked)

| file | shape | source |
|---|---|---|
| `us-states.json` | Albers-projected US topojson | ✅ copied from Grid Atlas |
| `world-110m.json` | countries topojson (ISO-A3 ids) | world-atlas (build) |
| `us-ev.json` | per state: `{name, salesShare:{years,vals}, evRegistered, evPer1k, chargingPorts, portsPer100k, topModel, incentive, gridCleanPct, gridCleanTrend:{years,vals}, resPrice, story}` | DOE AFDC, Atlas EV Hub, Argonne; clean%/price from `../grid-atlas/data/states.json` |
| `world-ev.json` | per country (ISO3): `{name, region, salesShare:{years,vals}, stock, stockPerCap, gridLowCarbonPct, story}` | IEA Global EV Data Explorer / OWID; grid % from Ember/OWID |
| `battery-prices.json` | `{years:[...], packUSDperKWh:[...]}` | BloombergNEF (OWID mirror) |
| `ev-prices.json` | US avg EV vs ICE price by year + cheapest-EV list | Cox/KBB, IEA, JATO |
| `timeline.json` | `[{year,date,title,body,category,stat,source}]` | hand-curated from `history-timeline` research (audited) |
| `global-summary.json` | global sales/stock/share by year + 4-region (China/Europe/USA/RoW) split | IEA / BNEF |

**Data availability is confirmed by the `ev-atlas-research` workflow** (running). If
per-state *sales-share history* isn't public, fall back to registration counts /
stock growth — research will say. The build pipeline (`build/`, Python 3.9, no
modern syntax) downloads the open datasets above and bakes `data/`; it reads
`../grid-atlas/data/states.json` for the clean-%/price cross-link. Document every
data decision in `build/CLAUDE.md` (provenance, vintage, BEV-vs-PHEV, caveats).

## Theme / code conventions (clone Grid Atlas)
- Evergreen tokens in `css/base.css`: `--paper:#11161B`, emerald `--accent:#41C98E`, ocean `--accent2:#5BA8DC`, gold `--gold:#F2B23E`; `[data-theme="light"]` overrides. Fonts: Barlow Condensed (display) / Manrope (body) / Spline Sans Mono (data). FOUC-guard `<head>` script reads `localStorage["eva-theme"]`.
- State flows one way: `main.js` owns active-tab + selection; view modules render.
- Theme-dependent SVG colors via `.style("fill","var(--x)")` so they live-switch; `map.refresh()` re-applies on theme change.
- Reuse from Grid Atlas: `usmap.js`, `area.js`, `line.js`, `waffle.js`(if useful), `infopopup.js`, `share.js` (html2canvas PNG export w/ watermark). New: `worldmap.js`, `timeline.js`.
- Footer cross-link: "Curious what's behind that clean-grid number? → Grid Atlas."

## Build order
1. ⏳ `ev-atlas-research` workflow → verified data + dataset URLs + timeline + stories.
2. Write `build/` pipeline → bake `data/`. 3. Build the 3 tabs (build workflow, fan out views). 4. Audit workflow (data accuracy + UX) + Playwright sweep. 5. Ship + add to maninae projects page.
