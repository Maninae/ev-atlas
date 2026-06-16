# EV Atlas

Static site (GitHub Pages): how the world is switching to electric cars. Three
tabs — **United States** (state-by-state), **The Planet** (every country), and a
museum-style **Timeline** (1832 → today). Sibling to [Grid Atlas](https://maninae.github.io/grid-atlas/);
it reuses Grid Atlas's grid-cleanliness data for the "how clean is charging here?"
connection. Audience: everyday readers; copy is plain-language with `(i)` popovers.

## Architecture

```
index.html            all markup for the 3 tabs (no templating)
css/
├── base.css           Evergreen theme tokens + hero/layout (cloned from Grid Atlas)
├── components.css     cards, forms, popovers, map bits (cloned)
├── charts.css         chart frames (cloned)
└── evatlas.css        EV-Atlas-only: top bar, tab nav, the timeline spine, callouts, panels
js/
├── main.js            boot, data load, hash routing (#us/#world/#timeline),
│                      lazy-init per tab, theme toggle, info popovers
├── choropleth.js      ONE config-driven map class — drives the US (pre-projected
│                      Albers) and World (live geoNaturalEarth1) maps; pass idFor/
│                      valueFor/colorFor/tipFor/legend/onClick
├── colors.js          per-metric color ramps (share/percap/charging/clean/growth)
├── states.js          state name → postal abbrev (joins geometry to data)
├── us-view.js         US tab: 4 choropleths + state detail panel + chips + search
├── world-view.js      World tab: 4 choropleths + country panel + callouts +
│                      battery learning-curve chart + cheapest-EV strip
├── timeline.js        the center-spine scrollytelling; era is derived from YEAR
│                      (six bands), nodes slide in via IntersectionObserver
└── charts/trend.js    compact line/area chart (clean-% history, country share, battery)
data/                  baked JSON — the live site makes ZERO API calls (see build/)
build/                 Python pipeline that regenerates data/ (not deployed)
```

State flows one way: `main.js` owns the active tab + loads data; each view module
owns its own selection + rendering. Tabs are lazy-initialized on first view so
maps build while their container is visible (SVG `viewBox` keeps them responsive).

## Key conventions / gotchas

- **No framework, no bundler.** ES modules + D3 v7 + topojson-client from jsDelivr.
- **All data is baked** in `data/*.json`. To change numbers, edit `build/` and
  re-run — never hand-edit `data/`. See `build/CLAUDE.md` for provenance.
- **Theme:** dark Evergreen default via `:root`; `[data-theme="light"]` overrides.
  Bootstrap script in `<head>` reads `localStorage["eva-theme"]` (falls back to
  `prefers-color-scheme`) before CSS loads, preventing FOUC. Map fills are set with
  `.style("fill", ...)`; on theme change `main.js` calls `refreshUS()/refreshWorld()`
  to re-apply the theme-dependent `--map-nodata`. The metric ramps in `colors.js`
  are FIXED in both themes (same discipline as Grid Atlas).
- **Choropleth join:** US joins on `STATE_ABBREV[feature.properties.name]`; World
  joins on `feature.id` (relabeled to ISO-A3 at build time). `valueFor` returning
  null → the geometry gets `--map-nodata`. Tiles whose `tipFor` returns null show
  no tooltip and are non-clickable.
- **Grid Atlas link:** the US "how clean is charging" card and cost-to-charge come
  from `../grid-atlas/data/states.json` (clean % + residential price), baked into
  `us-ev.json` by `build_us.py`. Cost math assumptions live in `us-view.js`
  (`KWH_PER_MI`, `MPG`, `GAS`) and are disclosed in the `charge` info popover.
- **Share honesty:** ~13 leading states have AAI-confirmed EV share; the rest are
  calibrated estimates (`shareEstimated: true`, flagged in the UI + methodology).
- **Timeline:** era color comes from the year, not the research category. Nodes
  reveal on scroll (IntersectionObserver, `unobserve` after) — a full-page
  screenshot shows below-fold nodes blank; that's expected.

## Local dev

```bash
python3 -m http.server 8137   # from repo root; open http://localhost:8137
```
(Needs a server: `fetch()` + ES modules won't run over `file://`.)
