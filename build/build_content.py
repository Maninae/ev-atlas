#!/usr/bin/env python3
"""Narrative + small-series content: data/timeline.json, battery-prices.json,
ev-prices.json, callouts.json. Timeline is transformed from the audited research
events; the rest are curated from audited figures."""
import common as C

# BloombergNEF volume-weighted-average lithium-ion PACK price, $/kWh (2019 set to
# 156 per the BNEF press release; 2024 = $115, the record low). Real terms.
BATTERY = {
    "years": [2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024],
    "vals":  [1160,  924,  726,  668,  592,  384,  295,  221,  181,  156,  137,  132,  151,  139,  115],
    "source": "BloombergNEF Lithium-Ion Battery Price Survey (nominal $/kWh)",
    "note": "Volume-weighted average pack price. The brief 2022 uptick was a lithium spike; 2024's $115 was a record low.",
}

EV_PRICES = {
    "evATP":       {"years": [2022, 2023, 2024, 2025], "vals": [66390, 53438, 56902, 58124]},
    "industryATP": {"years": [2019, 2021, 2022, 2023, 2024, 2025], "vals": [38948, 47077, 49507, 48334, 49740, 50080]},
    "source": "Cox Automotive / Kelley Blue Book average transaction prices (US)",
    "note": "In the US the average EV still costs more than the average new car — but the gap has narrowed sharply from its 2022 peak.",
    "cheapest": [
        {"model": "Wuling Hongguang Mini EV", "priceUSD": 4950, "where": "China", "note": "China's runaway best-selling city car"},
        {"model": "BYD Seagull", "priceUSD": 8000, "where": "China", "note": "Exported as the Dolphin Surf"},
        {"model": "Tata Tiago EV", "priceUSD": 8400, "where": "India", "note": "India's cheapest electric car"},
        {"model": "Dacia Spring", "priceUSD": 18400, "where": "Europe", "note": "€16,990 — Europe's budget EV"},
        {"model": "Citroën ë-C3", "priceUSD": 21600, "where": "Europe", "note": "€19,990 — built in Europe"},
    ],
}

CALLOUTS = [
    {"flag": "🇨🇳", "title": "China: the giant",
     "body": "About half of all new cars sold in China are electric. Its homegrown champion BYD now outsells Tesla worldwide, and a brutal domestic price war has produced capable EVs for under $10,000.",
     "stat": "~48% of new cars electric (2024)"},
    {"flag": "🇳🇴", "title": "Norway: the finish line",
     "body": "Two decades of taxing gas cars hard and rewarding EVs pushed Norway to the edge of an all-electric new-car market — roughly a decade ahead of everyone else.",
     "stat": "~92% of new cars electric (2024)"},
    {"flag": "🛺", "title": "The two- & three-wheeler revolution",
     "body": "In the Global South, electrification starts small and cheap. More than half of India's new auto-rickshaws are now electric, and battery-swap e-motorcycles are spreading fast across African cities.",
     "stat": "~57% of India's new 3-wheelers electric"},
]

# Targeted body/year refinements from the audit (keyed by title substring).
TWEAKS = {
    "Robert Anderson": {"date": "c. 1832"},
    "Self-Starter": {"body_append": " (First demonstrated in 1911 and fitted to the 1912 Cadillac, it ended the dangerous hand-crank — and with it the electric car's biggest selling point.)"},
}

# Editorial trim of the deep (pre-1990) history: the early section had too many
# entries, several making the same point. We cut ~half the pre-1990 stories
# (keyed by title substring), keeping the pivotal beats — the invention, the
# enabling battery, the 1900 peak, the gasoline-driven fall, and the mid-century
# revival seeds. The 1990+ revival/Tesla/mainstream eras are untouched. The
# pre-1990 survivors live behind the timeline's "go even further back" reveal.
DROP_TITLES = (
    "Thomas Davenport",                 # 1834 — redundant with Anderson's first-EV beat
    "Galvani",                          # 1842 Davidson locomotive — redundant
    "Hummingbird",                      # 1897 London cabs — kept the NYC fleet instead
    "Baker Motor",                      # 1899 — Detroit Electric (1907) carries this story
    "Electric Car That Never Was",      # 1914 Edison/Ford — a footnote
    "Cheap Texas Oil",                  # 1920 — Model T + self-starter already mark the fall
    "Electrovair",                      # 1966 — kept Henney + OPEC as the revival seeds
    "CitiCar",                          # 1974 — ditto
    "EV R&D Act",                       # 1976 — ditto
)


def build_timeline():
    R = C.research()
    events = R["history-timeline"]["research"]["events"]
    out = []
    for e in events:
        title = e.get("title") or ""
        if any(d.lower() in title.lower() for d in DROP_TITLES):
            continue
        rec = {
            "year": str(e.get("year")),
            "date": e.get("date") or str(e.get("year")),
            "title": e.get("title"),
            "body": e.get("body"),
            "category": e.get("category"),
            "stat": e.get("stat"),
            "source": e.get("source_name") or e.get("source"),
        }
        for needle, tw in TWEAKS.items():
            if needle.lower() in (rec["title"] or "").lower():
                if "date" in tw:
                    rec["date"] = tw["date"]
                if "body_append" in tw and tw["body_append"] not in (rec["body"] or ""):
                    rec["body"] = (rec["body"] or "") + tw["body_append"]
        out.append(rec)
    out.sort(key=lambda r: int("".join(ch for ch in r["year"] if ch.isdigit()) or 0))
    C.out("timeline.json", out)
    print("  timeline: %d events (%s - %s)" % (len(out), out[0]["year"], out[-1]["year"]))


def build():
    build_timeline()
    C.out("battery-prices.json", BATTERY)
    C.out("ev-prices.json", EV_PRICES)
    C.out("callouts.json", CALLOUTS)


if __name__ == "__main__":
    print("build_content.py")
    build()
