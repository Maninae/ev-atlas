/* Compact responsive line/area chart for trends — grid cleanliness over time,
   a country's EV-share history, the battery learning curve, EV-vs-ICE prices.
   trendChart(el, { years, series:[{vals,color,label,area}], yMax, yMin, format,
                    height, annotateLast }) */
const d3 = window.d3;

export function trendChart(el, cfg) {
  el.innerHTML = "";
  const years = cfg.years;
  const series = cfg.series;
  const W = el.clientWidth || 560;
  const H = cfg.height || Math.min(280, Math.max(180, W * 0.46));
  const m = { top: 16, right: cfg.annotateLast === false ? 16 : 52, bottom: 26, left: 42 };

  const svg = d3.select(el).append("svg")
    .attr("viewBox", `0 0 ${W} ${H}`).attr("width", "100%");

  const allVals = series.flatMap((s) => s.vals).filter((v) => v != null);
  const top = allVals.length ? Math.max(...allVals) : 1;
  const xDomain = years.length > 1 ? d3.extent(years) : [years[0] - 1, years[0] + 1];
  const x = d3.scaleLinear().domain(xDomain).range([m.left, W - m.right]);
  const y = d3.scaleLinear()
    .domain([cfg.yMin != null ? cfg.yMin : 0, cfg.yMax != null ? cfg.yMax : top * 1.12])
    .nice().range([H - m.bottom, m.top]);
  const fmt = cfg.format || ((v) => v);

  // gridlines + y ticks
  const yt = y.ticks(4);
  svg.append("g").selectAll("line").data(yt).join("line")
    .attr("x1", m.left).attr("x2", W - m.right).attr("y1", y).attr("y2", y)
    .attr("stroke", "var(--rule)").attr("stroke-width", 1);
  svg.append("g").selectAll("text").data(yt).join("text")
    .attr("x", m.left - 7).attr("y", (d) => y(d) + 4).attr("text-anchor", "end")
    .attr("class", "tc-axis").text((d) => fmt(d));
  // x ticks (first + last + mid)
  const xt = [years[0], years[Math.floor(years.length / 2)], years[years.length - 1]];
  svg.append("g").selectAll("text").data(xt).join("text")
    .attr("x", x).attr("y", H - 8).attr("text-anchor", "middle")
    .attr("class", "tc-axis").text((d) => d);

  const line = d3.line().defined((d) => d != null).x((d, i) => x(years[i])).y((d) => y(d)).curve(d3.curveMonotoneX);
  const area = d3.area().defined((d) => d != null).x((d, i) => x(years[i])).y0(H - m.bottom).y1((d) => y(d)).curve(d3.curveMonotoneX);

  series.forEach((s, i) => {
    const col = s.color || "var(--accent)";
    if (s.area) {
      const gid = "tc-grad-" + i + "-" + Math.round(x(years[0]));
      const g = svg.append("defs").append("linearGradient").attr("id", gid).attr("x1", 0).attr("x2", 0).attr("y1", 0).attr("y2", 1);
      g.append("stop").attr("offset", "0%").attr("stop-color", col).attr("stop-opacity", 0.28);
      g.append("stop").attr("offset", "100%").attr("stop-color", col).attr("stop-opacity", 0);
      svg.append("path").datum(s.vals).attr("d", area).attr("fill", `url(#${gid})`);
    }
    svg.append("path").datum(s.vals).attr("d", line)
      .attr("fill", "none").attr("stroke", col).attr("stroke-width", 2.5);
    // last-point dot + label
    const li = s.vals.length - 1;
    if (s.vals[li] != null) {
      svg.append("circle").attr("cx", x(years[li])).attr("cy", y(s.vals[li])).attr("r", 3.5).attr("fill", col);
      if (cfg.annotateLast !== false) {
        svg.append("text").attr("x", x(years[li]) + 7).attr("y", y(s.vals[li]) + 4)
          .attr("class", "tc-annot").attr("fill", col).text(s.label ? s.label : fmt(s.vals[li]));
      }
    }
  });
  return svg;
}
