#!/usr/bin/env python3
"""World tab data from OWID grapher CSVs (IEA EV data + Ember/EI grid data).
Outputs: data/world-110m.json (geometry, ids relabeled to ISO-A3),
         data/world-ev.json   (per-country metrics + trends + story),
         data/global-summary.json (global totals + China/Europe/US/RoW split)."""
import csv
import json
import os
import common as C

LATEST = 2024  # OWID/IEA GEO-2025 vintage: 2024 is the newest actual year.


def code_to_name():
    """ISO-a3 -> display name, taken from OWID Entity labels (clean, e.g. 'South Korea')."""
    names = {}
    for fn in ("owid_lowcarbon.csv", "owid_sales_share.csv"):
        with open(os.path.join(C.RAW, fn)) as f:
            for r in csv.reader(f):
                if len(r) >= 2 and r[1].strip() and r[1] != "Code":
                    names.setdefault(r[1].strip(), r[0].strip())
    return names


def build():
    iso = C.load_iso()                       # numeric -> {a3,name,region,subregion}
    a3_meta = {m["a3"]: m for m in iso.values()}
    names = code_to_name()

    share = C.load_owid("owid_sales_share.csv")   # a3 -> {year: %}
    stocks = C.load_owid("owid_stocks.csv")       # a3 -> {year: count}
    sales = C.load_owid("owid_sales.csv")         # a3 -> {year: count}
    lowc = C.load_owid("owid_lowcarbon.csv")      # a3 -> {year: %}
    pop = C.load_owid("owid_population.csv")       # a3 -> {year: people}

    def latest(d, key, ymax=LATEST):
        s = d.get(key)
        if not s:
            return None
        yrs = [y for y in s if y <= ymax]
        return s[max(yrs)] if yrs else None

    stories = _stories()

    # ---- per-country record ----
    world = {}
    codes = set(share) | set(lowc)
    for a3 in codes:
        if a3 not in a3_meta:           # drop OWID aggregates (World, Europe, EU27...)
            continue
        meta = a3_meta[a3]
        rec = {"name": names.get(a3, meta["name"]),
               "region": C.world_region(a3, meta["region"], meta["subregion"])}
        if a3 in share:
            ser = C.series({y: v for y, v in share[a3].items() if y <= LATEST}, ystart=2012)
            if ser["years"]:
                rec["salesShare"] = ser
                rec["shareLatest"] = ser["vals"][-1]
                rec["shareYear"] = ser["years"][-1]
                if len(ser["vals"]) >= 2:
                    rec["growth"] = round(ser["vals"][-1] - ser["vals"][-2], 2)
        st = latest(stocks, a3)
        if st is not None:
            rec["stock"] = int(st)
            p = latest(pop, a3)
            if p:
                rec["stockPer1k"] = round(st / p * 1000, 2)
        sl = latest(sales, a3)
        if sl is not None:
            rec["salesLatest"] = int(sl)
        if a3 in lowc:
            rec["lowCarbon"] = round(latest(lowc, a3), 1)
            lcser = C.series({y: v for y, v in lowc[a3].items() if y <= LATEST}, ystart=2000)
            rec["lowCarbonSeries"] = lcser
        if a3 in stories:
            rec["story"] = stories[a3]
        world[a3] = rec

    C.out("world-ev.json", world)

    # ---- relabel geometry ids numeric -> a3, clean display names ----
    topo = json.load(open(os.path.join(C.RAW, "world-110m.json")))
    geoms = topo["objects"]["countries"]["geometries"]
    matched = 0
    for g in geoms:
        try:
            num = int(g.get("id"))
        except (TypeError, ValueError):
            num = None
        m = iso.get(num)
        if m:
            g["id"] = m["a3"]
            g.setdefault("properties", {})["name"] = names.get(m["a3"], m["name"])
            matched += 1
        else:
            g["id"] = None
    C.out("world-110m.json", topo)
    print("  geometry: %d/%d countries matched to ISO-A3" % (matched, len(geoms)))

    # ---- global summary: totals + 4-region split ----
    W = "OWID_WRL"
    yrs = sorted(y for y in sales.get(W, {}) if y <= LATEST)
    split = {}
    eur = sales.get("Europe") or sales.get("OWID_EUR") or {}
    for y in yrs:
        w = sales[W].get(y)
        cn = sales.get("CHN", {}).get(y)
        us = sales.get("USA", {}).get(y)
        eu = eur.get(y)
        if None in (w, cn, us, eu):
            continue
        split[y] = {"China": int(cn), "Europe": int(eu), "United States": int(us),
                    "Rest of World": int(max(0, w - cn - us - eu))}
    summary = {
        "salesByYear": C.series({y: sales[W][y] for y in yrs}),
        "shareByYear": C.series({y: share[W][y] for y in sorted(share.get(W, {})) if y <= LATEST}),
        "stockByYear": C.series({y: stocks[W][y] for y in sorted(stocks.get(W, {})) if y <= LATEST}),
        "regionSplit": split,
        "latestYear": LATEST,
        "worldShareLatest": round(share[W][LATEST], 1) if LATEST in share.get(W, {}) else None,
        "worldSalesLatest": int(sales[W][LATEST]) if LATEST in sales.get(W, {}) else None,
        "worldStockLatest": int(stocks[W][LATEST]) if LATEST in stocks.get(W, {}) else None,
    }
    C.out("global-summary.json", summary)
    print("  global: %s world EV sales %s, share %s%%" % (
        LATEST, summary["worldSalesLatest"], summary["worldShareLatest"]))


def _stories():
    """Curated, audit-corrected one-liners attached to standout countries."""
    return {
        "CHN": "The undisputed giant: about half of all new cars sold in China are now electric, and Chinese brands like BYD sell more EVs than anyone on earth.",
        "NOR": "The finish line, almost reached. Norway taxed gas cars hard and rewarded EVs for years — now ~9 in 10 new cars are electric.",
        "IND": "India electrifies the small stuff first: more than half of its new three-wheelers (the ubiquitous auto-rickshaw) are now electric, even as EV cars stay niche.",
        "NPL": "Nepal runs on hydropower — nearly its entire grid is clean — and slashed EV import taxes, so battery cars now make up a striking share of its imports.",
        "VNM": "Home-grown VinFast went all-electric and flooded the streets with e-scooters, making Vietnam one of Asia's fastest two-wheeler switchers.",
        "USA": "A patchwork nation: California looks like Europe while other states barely register — the US average hides a 10x gap between its states.",
        "DEU": "Europe's car-making heartland is going electric under pressure from EU CO2 rules, though subsidy cuts cooled demand in 2024.",
        "BRA": "Chinese brands arrived fast; BYD and GWM turned Brazil into Latin America's busiest EV market almost overnight.",
        "THA": "Thailand offered cash incentives and became Southeast Asia's EV assembly hub, with Chinese automakers building factories there.",
    }


if __name__ == "__main__":
    print("build_world.py")
    build()
