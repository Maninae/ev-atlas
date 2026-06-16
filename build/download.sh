#!/usr/bin/env bash
# Fetch raw public datasets into raw/. Idempotent. The live site uses none of
# these directly — build_*.py bake them into ../data/*.json.
set -e
cd "$(dirname "$0")"
mkdir -p raw
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
get () { echo "-> $2"; curl -sSL --compressed -A "$UA" "$1" -o "raw/$2"; }

# Our World in Data graphers (IEA EV data + Ember/EI grid data) — direct CSV, no auth
OWID="https://ourworldindata.org/grapher"
Q="?v=1&csvType=full&useColumnShortNames=false"
get "$OWID/electric-car-sales-share.csv$Q"        owid_sales_share.csv
get "$OWID/electric-car-stocks.csv$Q"             owid_stocks.csv
get "$OWID/electric-car-sales.csv$Q"              owid_sales.csv
get "$OWID/share-electricity-low-carbon.csv$Q"    owid_lowcarbon.csv
get "$OWID/population.csv$Q"                       owid_population.csv

# DOE AFDC — US state BEV registrations (Experian), 2023
get "https://afdc.energy.gov/files/u/data/data_source/10962/10962-ev-registration-counts-by-state_9-06-24.xlsx" afdc_ev_registrations.xlsx

# World geometry (Natural Earth via world-atlas) + ISO numeric->A3/region crosswalk
get "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json" world-110m.json
get "https://raw.githubusercontent.com/lukes/ISO-3166-Countries-with-Regional-Codes/master/all/all.csv" iso_codes.csv

echo "done. raw/ ready — now run build_world.py, build_us.py, build_content.py"
