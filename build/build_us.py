#!/usr/bin/env python3
"""US tab data: AFDC BEV registrations + the all-50 share/ports fill + Grid Atlas
grid-cleanliness & electricity prices -> data/us-ev.json.
Run build_world is independent; this one needs us_fill.json + the grid-atlas repo."""
import json
import os
import openpyxl
import common as C

CLEAN_FUELS = ("solar", "wind", "hydro", "nuclear", "geothermal")  # matches Grid Atlas cleanShare
# Share values confirmed from the AAI Q1-2025 press release (the rest are calibrated estimates).
SHARE_CONFIRMED = {"CA", "DC", "WA", "CO", "OR", "NV", "NJ", "HI", "CT", "VT", "MA", "DE", "FL"}


def afdc_bev():
    wb = openpyxl.load_workbook(os.path.join(C.RAW, "afdc_ev_registrations.xlsx"), data_only=True)
    ws = wb["EV Registration Counts in 2023"]
    out = {}
    for row in ws.iter_rows(min_row=4, values_only=True):
        name, count = row[1], row[2]
        if name in C.NAME_STATE and isinstance(count, (int, float)):
            out[C.NAME_STATE[name]] = int(count)
    return out


def clean_series(state):
    """Grid Atlas trend -> clean % per year (same fuel set as Grid Atlas)."""
    tr = state.get("trend") or {}
    years = tr.get("years") or []
    series = tr.get("series") or {}
    vals = []
    for i in range(len(years)):
        s = 0.0
        for f in CLEAN_FUELS:
            arr = series.get(f)
            if arr and i < len(arr) and arr[i] is not None:
                s += arr[i]
        vals.append(round(s, 1))
    return {"years": years, "vals": vals}


def ranked(records, key, reverse=True):
    order = sorted((k for k in records if records[k].get(key) is not None),
                   key=lambda k: records[k][key], reverse=reverse)
    for i, k in enumerate(order):
        records[k][key + "Rank"] = i + 1
    return len(order)


def build():
    fill = json.load(open(os.path.join(C.HERE, "us_fill.json")))
    bev = afdc_bev()
    grid = json.load(open(C.GRID_ATLAS_STATES))

    states = {}
    for ab, name in C.STATE_NAME.items():
        pop = C.STATE_POP[ab]
        stock = bev.get(ab)
        g = grid.get(ab) or {}
        facts = g.get("facts") or {}
        price = g.get("price") or {}
        res = price.get("res") or []
        rec = {
            "name": name,
            "share": fill["share"].get(ab),
            "shareEstimated": ab not in SHARE_CONFIRMED,
            "evStock": stock,
            "evPer1k": round(stock / pop * 1000, 2) if stock else None,
            "ports": fill["ports"].get(ab),
            "portsPer100k": round(fill["ports"][ab] / pop * 100000, 1) if fill["ports"].get(ab) else None,
            "topModel": fill.get("topModel", {}).get(ab),
            "gridClean": facts.get("cleanNow"),
            "gridCleanThen": facts.get("cleanThen"),
            "gridCleanSeries": clean_series(g) if g else None,
            "resPrice": res[-1] if res else None,         # cents/kWh, latest (2025)
            "co2": g.get("co2_g_kwh"),
        }
        states[ab] = rec

    n = len(states)
    ranked(states, "share")
    ranked(states, "evPer1k")
    ranked(states, "portsPer100k")
    ranked(states, "gridClean")

    states["_meta"] = {
        "shareYear": fill.get("share_year"),
        "shareSource": fill.get("share_source"),
        "portsYear": fill.get("ports_year"),
        "portsSource": fill.get("ports_source"),
        "stockYear": "2023",
        "stockSource": "DOE AFDC, EV Registration Counts by State (BEVs only)",
        "gridSource": "Grid Atlas (EPA eGRID / EIA)",
        "count": n,
        "nationalStock": sum(s["evStock"] for s in states.values() if isinstance(s, dict) and s.get("evStock")),
        "note": "Share = EV (BEV+PHEV) % of new vehicle registrations; ~13 leading states are confirmed, others are calibrated estimates. Registrations are battery-electric only (BEV).",
    }
    C.out("us-ev.json", states)
    lead = max((k for k in states if k != "_meta"), key=lambda k: states[k]["share"] or 0)
    print("  %d states; share leader %s %.1f%%; national BEV stock %s" % (
        n, lead, states[lead]["share"], states["_meta"]["nationalStock"]))


if __name__ == "__main__":
    print("build_us.py")
    build()
