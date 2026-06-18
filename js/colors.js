/* Metric → color for the choropleth maps. Each of the four lenses (per tab) gets
   a distinct single-hue ramp so a 2x2 grid reads as four different questions.
   Ramps are FIXED in both themes (only --map-nodata is theme-dependent), the same
   discipline Grid Atlas settled on after a theme-dependent ramp read backwards.

   "clean" deliberately reuses Grid Atlas's green ramp — the two sites share that
   metric, so they should share the color. */
const d3 = window.d3;

// [lo, hi] endpoints per metric.
const RAMPS = {
  share:    ["#0E2230", "#2FE3D0"], // EV share of new cars — electric teal-cyan (brand)
  percap:   ["#1A1B33", "#9D8CFF"], // EVs per 1,000 people — electric violet
  charging: ["#2A2620", "#F5B63F"], // charging ports per capita — charged amber
  clean:    ["#142621", "#39D98E"], // grid cleanliness — green (Grid Atlas cross-link)
  growth:   ["#1B1A33", "#9D8CFF"], // YoY growth — violet (momentum)
  lowcarbon:["#142621", "#39D98E"], // world grid low-carbon % — same green as clean
};

// "growth" is the YoY change in EV share (percentage points) and CAN be negative
// (Germany, Iceland, etc. fell in 2024). It gets a DIVERGING ramp centered on 0 so
// declines read differently from flat — a single-hue ramp would paint them alike.
const GROWTH_NEG = ["#D06A4A", "#2A3350"]; // -8pp (amber-red) → 0 (neutral indigo)
const GROWTH_POS = ["#2A3350", "#9D8CFF"]; // 0 (neutral indigo) → +12pp (violet)

// Build a value→color function. `max` sets the top of the ramp (each map
// normalizes to its own domain).
export function colorFn(metric, max) {
  if (metric === "growth") {
    const neg = d3.interpolateRgb(GROWTH_NEG[0], GROWTH_NEG[1]);
    const pos = d3.interpolateRgb(GROWTH_POS[0], GROWTH_POS[1]);
    return (v) => {
      if (v == null) return null;
      return v < 0 ? neg(Math.max(0, Math.min(1, (v + 8) / 8)))
                   : pos(Math.max(0, Math.min(1, v / (max || 12))));
    };
  }
  const [lo, hi] = RAMPS[metric] || RAMPS.share;
  const f = d3.interpolateRgb(lo, hi);
  const top = max || 100;
  return (v) => (v == null ? null : f(Math.max(0, Math.min(1, v / top))));
}

// The swatches for a gradient legend bar.
export function rampColors(metric) {
  if (metric === "growth") return [GROWTH_NEG[0], GROWTH_NEG[1], GROWTH_POS[1]];
  const [lo, hi] = RAMPS[metric] || RAMPS.share;
  const mid = d3.interpolateRgb(lo, hi)(0.5);
  return [lo, mid, hi];
}

export function legendHtml(metric, loLabel, hiLabel) {
  // The growth metric uses a diverging ramp around 0 (negatives → indigo neutral
  // → positives). Without a midpoint label the reader can't tell where 0 sits on
  // the asymmetric -8..+12 bar, so add one. Other metrics keep their simple lo/hi.
  if (metric === "growth") {
    return `<span class="legend-lo">${loLabel}</span>` +
      `<span class="legend-ramp" style="background:linear-gradient(90deg, ${rampColors(metric).join(",")})"></span>` +
      `<span class="legend-mid">0</span>` +
      `<span class="legend-hi">${hiLabel}</span>`;
  }
  return `<span class="legend-lo">${loLabel}</span>` +
    `<span class="legend-ramp" style="background:linear-gradient(90deg, ${rampColors(metric).join(",")})"></span>` +
    `<span class="legend-hi">${hiLabel}</span>`;
}

export { RAMPS };
