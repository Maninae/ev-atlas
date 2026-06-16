# 🔋 EV Atlas

**[maninae.github.io/electric-vehicle-adoption](https://maninae.github.io/electric-vehicle-adoption)**

How the world is switching to electric cars — and what it means where you live.

A data-journalism site with three views:

- **🇺🇸 United States** — every state mapped four ways (EV share of new cars, EVs
  per person, charging density, and how clean the local grid is), then a deep
  panel for any state you click, including what it actually costs to charge there.
- **🌍 The Planet** — every country, from Norway (~92% of new cars electric) to
  China (the giant, ~48%) to the Global South, where the revolution is happening
  on two and three wheels. Plus the falling battery price that made it all possible.
- **🕰️ Timeline** — a scroll through 200 years, from Robert Anderson's 1832
  carriage and the electric cabs that ruled 1900, through the gas takeover and the
  crushed EV1, to BYD outselling Tesla.

It's a sibling to **[Grid Atlas](https://maninae.github.io/grid-atlas)** and shares
its grid-cleanliness data — because an electric car is only as clean as the grid
that charges it.

## How it's built

A no-framework static site: ES modules + [D3](https://d3js.org) + TopoJSON. **All
data is baked into static JSON at build time — the live site makes zero API calls
and tracks nothing.** A small Python pipeline (`build/`) turns open datasets into
that JSON.

**Sources:** [IEA Global EV Outlook](https://www.iea.org/reports/global-ev-outlook-2025)
(via [Our World in Data](https://ourworldindata.org/electric-car-sales)) ·
[US DOE Alternative Fuels Data Center](https://afdc.energy.gov/data) ·
[BloombergNEF](https://about.bnef.com) battery prices ·
[Ember](https://ember-energy.org) / OWID grid data ·
Alliance for Automotive Innovation. Every figure is researched and cross-checked;
the few estimated values are flagged in the interface.

## Run it locally

```bash
python3 -m http.server 8137      # then open http://localhost:8137
# rebuild the data: cd build && ./download.sh && python3 build_world.py build_us.py build_content.py
```

See [`CLAUDE.md`](CLAUDE.md) for the architecture and [`build/CLAUDE.md`](build/CLAUDE.md)
for data provenance.

## License

MIT © Owen Wang. Data belongs to its original publishers, cited above.
