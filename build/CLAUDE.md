# EV Atlas — data pipeline

Turns free public datasets into the compact JSON in `../data/` that the static
site loads. Run once (or when new data drops). The site never calls any API.

## How to run

```bash
./download.sh                      # fetch raw inputs into raw/  (idempotent)
python3 build_world.py             # -> world-ev.json, world-110m.json, global-summary.json
python3 build_us.py                # -> us-ev.json   (needs ../../grid-atlas + us_fill.json)
python3 build_content.py           # -> timeline.json, battery-prices.json, ev-prices.json, callouts.json
```

Python 3.9-safe (no `match`, no `X | Y`). Needs `openpyxl` (for the AFDC xlsx);
everything else is stdlib.

## Inputs (`raw/`, git-ignored — rebuild with download.sh)

| file | source | used for |
|---|---|---|
| `owid_sales_share.csv` | Our World in Data (IEA GEO 2025) | country EV % of new cars, 2010–2024 |
| `owid_stocks.csv` / `owid_sales.csv` | OWID (IEA) | EV fleet + annual sales by country |
| `owid_lowcarbon.csv` | OWID (Ember / Energy Institute) | grid low-carbon % by country |
| `owid_population.csv` | OWID (UN/HYDE) | per-capita denominators |
| `afdc_ev_registrations.xlsx` | DOE AFDC (Experian) | US state BEV stock, 2023 (BEV only) |
| `world-110m.json` | world-atlas (Natural Earth) | world geometry (numeric ISO ids) |
| `iso_codes.csv` | ISO-3166 (lukes/GitHub) | numeric→A3 + region crosswalk |
| `../research.json` | the EV-Atlas research workflow (audited) | timeline events, stories |
| `../us_fill.json` | the US-fill workflow (audited) | all-50 EV share + charging ports |

## Data decisions (read before changing anything)

- **Vintage:** OWID/IEA Global EV Outlook 2025 → **2024 is the latest actual year**.
  OWID rows for 2025 are early estimates and are clipped out of baked series.
- **World join:** `world-110m` geometries carry numeric ISO ids; `build_world.py`
  relabels each `id` to ISO-A3 (via `iso_codes.csv`) so the choropleth joins to
  OWID's A3 codes. 174/177 countries match (the misses are tiny/disputed).
- **EV share** is BEV+PHEV % of new cars (IEA definition). **US state stock** from
  AFDC is **BEV only** (PHEVs excluded — stated in the UI). Don't mix the two.
- **Global split:** China/Europe/USA are OWID aggregate rows; Rest of World =
  World − China − Europe − USA (counts). 2024 totals ≈ 17.5M.
- **Grid cleanliness:** US states reuse Grid Atlas `states.json` (`facts.cleanNow`
  + a clean-% series computed from its `trend` with the SAME fuel set Grid Atlas
  uses — solar/wind/hydro/nuclear/geothermal, biomass excluded). World uses OWID
  low-carbon % (includes nuclear). The two definitions differ slightly by design.
- **Battery prices** (`build_content.py`) are the BloombergNEF pack-price survey,
  hard-coded (2019 = $156, 2024 = $115 — record low). OWID's grapher slug 404s, so
  the canonical BNEF series is baked directly.
- **US share** ⚠️: ~13 leading states are AAI-confirmed; the rest are calibrated
  estimates (`SHARE_CONFIRMED` in `build_us.py`; `shareEstimated` flag in output).
- **State populations** (Census V2023) live in `common.py` for per-capita math.

## Refreshing next year

1. Re-run `./download.sh` (OWID grapher URLs are stable; bump the AFDC xlsx URL if
   they post a newer registrations file).
2. Bump `LATEST` in `build_world.py` once IEA GEO publishes the next actual year.
3. Refresh `us_fill.json` (latest AAI quarter + AFDC port counts) and the BNEF
   `BATTERY` series in `build_content.py`. Extend `timeline`/`callouts` by hand.
