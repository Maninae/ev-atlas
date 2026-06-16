/* Metric → color for the choropleth maps. Each of the four lenses (per tab) gets
   a distinct single-hue ramp so a 2x2 grid reads as four different questions.
   Ramps are FIXED in both themes (only --map-nodata is theme-dependent), the same
   discipline Grid Atlas settled on after a theme-dependent ramp read backwards.

   "clean" deliberately reuses Grid Atlas's green ramp — the two sites share that
   metric, so they should share the color. */
const d3 = window.d3;

// [lo, hi] endpoints per metric.
const RAMPS = {
  share:    ["#1E2A33", "#2FE0A0"], // EV share of new cars — electric mint-green
  percap:   ["#1B2A38", "#5BA8DC"], // EVs per 1,000 people — ocean blue
  charging: ["#2A2620", "#F2B23E"], // charging ports per capita — gold
  clean:    ["#232C33", "#3ECF8E"], // grid cleanliness — Grid Atlas green (shared)
  growth:   ["#211E33", "#A78BFA"], // YoY growth — violet (momentum)
  lowcarbon:["#232C33", "#3ECF8E"], // world grid low-carbon % — same green as clean
};

// "growth" is the YoY change in EV share (percentage points) and CAN be negative
// (Germany, Iceland, etc. fell in 2024). It gets a DIVERGING ramp centered on 0 so
// declines read differently from flat — a single-hue ramp would paint them alike.
const GROWTH_NEG = ["#D06A4A", "#39424B"]; // -8pp (amber-red) → 0 (neutral)
const GROWTH_POS = ["#39424B", "#A78BFA"]; // 0 (neutral) → +12pp (violet)

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
  return `<span class="legend-lo">${loLabel}</span>` +
    `<span class="legend-ramp" style="background:linear-gradient(90deg, ${rampColors(metric).join(",")})"></span>` +
    `<span class="legend-hi">${hiLabel}</span>`;
}

export { RAMPS };
