/* Museum-exhibit timeline: a center spine you scroll down to travel through time.
   Nodes alternate left/right, slide in on scroll, and are color-banded by era.
   Renders from an events array: [{year, date, title, body, category, stat, source}].

   Era is derived from the YEAR (not the research category) so the spine reads as
   a continuous journey through six periods, the way a museum hall would lay it out. */

const ERAS = [
  { key: "dawn",       label: "The Electric Dawn",   max: 1907, hint: "1830s–1900s" },
  { key: "gas",        label: "Gasoline Takes Over",  max: 1929, hint: "1908–1929" },
  { key: "darkage",    label: "The Quiet Decades",    max: 1989, hint: "1930–1989" },
  { key: "revival",    label: "False Starts & Revival", max: 2007, hint: "1990–2007" },
  { key: "tesla",      label: "The Tesla Era",        max: 2019, hint: "2008–2019" },
  { key: "mainstream", label: "Going Mainstream",     max: 9999, hint: "2020–today" },
];

function eraFor(year) {
  const y = parseInt(String(year), 10);
  for (const e of ERAS) if (y <= e.max) return e;
  return ERAS[ERAS.length - 1];
}

export function renderTimeline(container, events) {
  const sorted = events.slice().sort((a, b) =>
    parseInt(a.year, 10) - parseInt(b.year, 10));

  const frag = document.createDocumentFragment();
  const spine = document.createElement("div");
  spine.className = "tl-spine";
  frag.appendChild(spine);

  let lastEra = null;
  sorted.forEach((ev, i) => {
    const era = eraFor(ev.year);

    // Era header drops in whenever we cross into a new period.
    if (!lastEra || era.key !== lastEra) {
      const h = document.createElement("div");
      h.className = "tl-era";
      h.dataset.era = era.key;
      h.innerHTML = `<span class="tl-era-hint">${era.hint}</span>
        <span class="tl-era-label">${era.label}</span>`;
      frag.appendChild(h);
      lastEra = era.key;
    }

    const node = document.createElement("div");
    node.className = "tl-node " + (i % 2 === 0 ? "left" : "right");
    node.dataset.era = era.key;
    node.innerHTML = `
      <div class="tl-dot"></div>
      <div class="tl-card">
        <div class="tl-year">${ev.date || ev.year}</div>
        <h3 class="tl-title">${ev.title}</h3>
        <p class="tl-body">${ev.body}</p>
        ${ev.stat ? `<div class="tl-stat">${ev.stat}</div>` : ""}
        ${ev.source ? `<div class="tl-src">${ev.source}</div>` : ""}
      </div>`;
    frag.appendChild(node);
  });

  container.innerHTML = "";
  container.appendChild(frag);

  // Slide-in on scroll. Once revealed, stay revealed (museum panels don't
  // un-light as you walk past). rootMargin trips slightly before center.
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (en.isIntersecting) {
        en.target.classList.add("in-view");
        io.unobserve(en.target);
      }
    }
  }, { rootMargin: "0px 0px -12% 0px", threshold: 0.15 });

  container.querySelectorAll(".tl-node, .tl-era").forEach((n) => io.observe(n));

  // A sticky ticker naming the era currently under the viewport center —
  // the "you are here in time" cue. Updated on scroll, rAF-throttled.
  const ticker = container.parentElement.querySelector(".tl-ticker");
  if (ticker) {
    const nodes = Array.from(container.querySelectorAll(".tl-node"));
    let queued = false;
    const update = () => {
      queued = false;
      const mid = window.innerHeight / 2;
      let cur = null;
      for (const n of nodes) {
        const r = n.getBoundingClientRect();
        if (r.top <= mid) cur = n; else break;
      }
      if (cur) {
        const era = ERAS.find((e) => e.key === cur.dataset.era);
        const yr = cur.querySelector(".tl-year").textContent;
        ticker.innerHTML = `<span class="tk-year">${yr}</span><span class="tk-era">${era ? era.label : ""}</span>`;
        ticker.dataset.era = cur.dataset.era;
      }
    };
    window.addEventListener("scroll", () => {
      if (!queued) { queued = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }
}

export { ERAS };
