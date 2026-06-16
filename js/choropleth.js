/* Config-driven choropleth — one class drives BOTH the US state map (pre-projected
   Albers geometry, like Grid Atlas) and the world country map (live projection).
   One instance per metric tile; all instances share a single tooltip element.

   new Choropleth(el, {
     topo, objectName,        // topojson object: topo.objects[objectName]
     projection,              // null => geometry is pre-projected (US albers-10m);
                              //          otherwise a d3 projection fitted to viewBox (world)
     viewBox: [W, H],
     idFor:    (feature) => key | null,   // feature -> data join key (abbrev / ISO3)
     nameFor:  (feature) => label,        // feature -> display name
     valueFor: (key) => value | null,     // data lookup for this metric
     colorFor: (value) => cssColor,       // value -> fill (null -> nodata var)
     tipFor:   (key, name) => htmlString, // tooltip body (null => skip tile)
     legend:   () => htmlString,          // legend markup
     onClick:  (key) => void,
   })
*/
const d3 = window.d3;
const topojson = window.topojson;

export class Choropleth {
  constructor(el, cfg) {
    this.cfg = cfg;
    this.el = el;
    const [W, H] = cfg.viewBox || [975, 610];

    this.svg = d3.select(el).append("svg")
      .attr("viewBox", `0 0 ${W} ${H}`)
      .attr("width", "100%")
      .attr("class", "choropleth-svg metric-" + (cfg.metric || "x"));

    const obj = cfg.topo.objects[cfg.objectName];
    const features = topojson.feature(cfg.topo, obj).features;

    // Pre-projected geometry (US albers-10m) -> geoPath with identity stream.
    // Otherwise fit the supplied projection to the viewBox once.
    let path;
    if (cfg.projection) {
      const fc = { type: "FeatureCollection", features };
      cfg.projection.fitExtent([[2, 2], [W - 2, H - 2]], fc);
      path = d3.geoPath(cfg.projection);
    } else {
      path = d3.geoPath();
    }

    // Paths are deliberately NOT focusable — focusable SVG paths pick up OS
    // focus rings on click that CSS can't always kill (Safari / Full Keyboard
    // Access). Keyboard users select via the chip buttons / search.
    this.paths = this.svg.append("g").selectAll("path")
      .data(features).join("path")
      .attr("d", path)
      .attr("class", "geo")
      .attr("aria-label", (d) => cfg.nameFor(d))
      .on("mousemove", (ev, d) => this.showTip(ev, d))
      .on("mouseleave", () => this.tip.style("opacity", 0))
      .on("click", (ev, d) => {
        const key = cfg.idFor(d);
        if (key && cfg.onClick) cfg.onClick(key);
      });

    // Features with no join key (Antarctica, unmatched geometry) shouldn't grab
    // the cursor — no data, no tooltip, no click.
    this.paths.filter((d) => cfg.idFor(d) == null).style("pointer-events", "none");

    // Internal borders mesh — crisp 1px seams, theme-colored via CSS.
    this.svg.append("path")
      .datum(topojson.mesh(cfg.topo, obj, (a, b) => a !== b))
      .attr("class", "geo-borders")
      .attr("d", path);

    this.tip = d3.select(document.body).selectAll("div.map-tip").data([0])
      .join("div").attr("class", "map-tip");

    if (cfg.legend) {
      this.legendEl = document.createElement("div");
      this.legendEl.className = "map-legend";
      el.appendChild(this.legendEl);
    }
    this.refresh();
  }

  refresh() {
    const nodata = getComputedStyle(document.documentElement)
      .getPropertyValue("--map-nodata").trim();
    this.paths.style("fill", (d) => {
      const key = this.cfg.idFor(d);
      const v = key == null ? null : this.cfg.valueFor(key);
      return (v == null || v === undefined) ? nodata : this.cfg.colorFor(v);
    });
    if (this.legendEl && this.cfg.legend) this.legendEl.innerHTML = this.cfg.legend();
  }

  setSelected(key, flash = false) {
    this.paths.classed("selected", (d) => this.cfg.idFor(d) === key);
    this.paths.classed("flash", false);
    if (!flash || !key) return;
    // Off-white glow on the newly selected geometry; reflow forced so a
    // re-click restarts the animation.
    const target = this.paths.filter((d) => this.cfg.idFor(d) === key);
    target.each(function () { void this.getBoundingClientRect(); });
    target.classed("flash", true)
      .on("animationend.flash", function () { d3.select(this).classed("flash", false); });
  }

  showTip(ev, d) {
    const key = this.cfg.idFor(d);
    if (key == null) return;
    const html = this.cfg.tipFor ? this.cfg.tipFor(key, this.cfg.nameFor(d)) : null;
    if (!html) return;
    this.tip
      .style("opacity", 1)
      .style("left", `${ev.pageX + 14}px`)
      .style("top", `${ev.pageY - 10}px`)
      .html(html);
  }

  destroy() { this.svg.remove(); if (this.legendEl) this.legendEl.remove(); }
}

/* ---- shared color helpers ---- */

// Sequential ramp between two hex endpoints, clamped to [0,1].
export function ramp2(lo, hi) {
  const f = d3.interpolateRgb(lo, hi);
  return (t) => f(Math.max(0, Math.min(1, t)));
}

// Legend markup: a gradient bar with lo/hi captions (matches Grid Atlas).
export function rampLegend(colors, lo, hi) {
  return `<span class="legend-lo">${lo}</span>` +
    `<span class="legend-ramp" style="background:linear-gradient(90deg, ${colors.join(",")})"></span>` +
    `<span class="legend-hi">${hi}</span>`;
}
