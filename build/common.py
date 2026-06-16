# Shared constants + loaders for the EV Atlas build pipeline. Python 3.9 — no
# modern-syntax (no match, no X | Y unions). The live site never runs any of this;
# everything is baked to ../data/*.json.
import csv
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, "raw")
DATA = os.path.join(HERE, "..", "data")
RESEARCH = os.path.join(HERE, "research.json")
# Grid Atlas is a sibling repo; we reuse its per-state clean-% + price series so
# the two sites agree on grid cleanliness. Override with GRID_ATLAS_STATES env var.
GRID_ATLAS_STATES = os.environ.get(
    "GRID_ATLAS_STATES",
    os.path.join(HERE, "..", "..", "grid-atlas", "data", "states.json"))


def out(name, obj):
    path = os.path.join(DATA, name)
    with open(path, "w") as f:
        json.dump(obj, f, separators=(",", ":"), ensure_ascii=False)
    print("  wrote data/%s  (%d KB)" % (name, os.path.getsize(path) // 1024))


# ---- US states ----
STATE_NAME = {
    "AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas",
    "CA": "California", "CO": "Colorado", "CT": "Connecticut", "DE": "Delaware",
    "FL": "Florida", "GA": "Georgia", "HI": "Hawaii", "ID": "Idaho",
    "IL": "Illinois", "IN": "Indiana", "IA": "Iowa", "KS": "Kansas",
    "KY": "Kentucky", "LA": "Louisiana", "ME": "Maine", "MD": "Maryland",
    "MA": "Massachusetts", "MI": "Michigan", "MN": "Minnesota", "MS": "Mississippi",
    "MO": "Missouri", "MT": "Montana", "NE": "Nebraska", "NV": "Nevada",
    "NH": "New Hampshire", "NJ": "New Jersey", "NM": "New Mexico", "NY": "New York",
    "NC": "North Carolina", "ND": "North Dakota", "OH": "Ohio", "OK": "Oklahoma",
    "OR": "Oregon", "PA": "Pennsylvania", "RI": "Rhode Island", "SC": "South Carolina",
    "SD": "South Dakota", "TN": "Tennessee", "TX": "Texas", "UT": "Utah",
    "VT": "Vermont", "VA": "Virginia", "WA": "Washington", "WV": "West Virginia",
    "WI": "Wisconsin", "WY": "Wyoming", "DC": "District of Columbia",
}
NAME_STATE = {v: k for k, v in STATE_NAME.items()}

# Census Vintage-2023 state population estimates (people). Used for per-capita.
STATE_POP = {
    "AL": 5108468, "AK": 733406, "AZ": 7431344, "AR": 3067732, "CA": 38965193,
    "CO": 5877610, "CT": 3617176, "DE": 1031890, "FL": 22610726, "GA": 11029227,
    "HI": 1435138, "ID": 1964726, "IL": 12549689, "IN": 6862199, "IA": 3207004,
    "KS": 2940546, "KY": 4526154, "LA": 4573749, "ME": 1395722, "MD": 6180253,
    "MA": 7001399, "MI": 10037261, "MN": 5737915, "MS": 2939690, "MO": 6196156,
    "MT": 1132812, "NE": 1978379, "NV": 3194176, "NH": 1402054, "NJ": 9290841,
    "NM": 2114371, "NY": 19571216, "NC": 10835491, "ND": 783926, "OH": 11785935,
    "OK": 4053824, "OR": 4233358, "PA": 12961683, "RI": 1095962, "SC": 5373555,
    "SD": 919318, "TN": 7126489, "TX": 30503301, "UT": 3417734, "VT": 647464,
    "VA": 8715698, "WA": 7812880, "WV": 1770071, "WI": 5910955, "WY": 584057,
    "DC": 678972,
}


# ---- world ISO crosswalk (numeric id -> a3 / name / region) ----
def load_iso():
    """numeric-code(int) -> dict(a3, name, region, subregion)."""
    table = {}
    with open(os.path.join(RAW, "iso_codes.csv")) as f:
        for row in csv.DictReader(f):
            try:
                num = int(row["country-code"])
            except (ValueError, KeyError):
                continue
            table[num] = {
                "a3": row["alpha-3"],
                "name": row["name"],
                "region": row["region"],
                "subregion": row["sub-region"],
            }
    return table


def world_region(a3, region, subregion):
    """Coarse bucket for the global sales split + callout grouping."""
    if a3 == "CHN":
        return "China"
    if a3 == "USA":
        return "United States"
    if region == "Europe":
        return "Europe"
    return "Rest of World"


# ---- OWID grapher CSV loader ----
def load_owid(filename, value_col=None):
    """OWID grapher CSV (Entity,Code,Year,<value>) -> {a3: {year:int -> float}}.
    Rows without an ISO Code (aggregates like 'World') are keyed by their Entity
    name instead, so callers can still read World/Europe rows."""
    path = os.path.join(RAW, filename)
    by_code = {}
    with open(path) as f:
        reader = csv.reader(f)
        header = next(reader)
        vcol = header.index(value_col) if value_col else 3
        for r in reader:
            if len(r) <= vcol or not r[vcol].strip():
                continue
            entity, code, year = r[0], r[1], r[2]
            key = code.strip() or entity.strip()
            try:
                y = int(year)
                v = float(r[vcol])
            except ValueError:
                continue
            by_code.setdefault(key, {})[y] = v
    return by_code


def research():
    data = json.load(open(RESEARCH))
    return {d["domain"]: d for d in data if isinstance(d, dict)}


def series(d, ystart=None, yend=None):
    """{year->val} dict -> {'years':[...], 'vals':[...]} sorted, optionally clipped."""
    years = sorted(d)
    if ystart is not None:
        years = [y for y in years if y >= ystart]
    if yend is not None:
        years = [y for y in years if y <= yend]
    return {"years": years, "vals": [round(d[y], 2) for y in years]}
