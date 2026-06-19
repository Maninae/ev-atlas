/* Museum-exhibit timeline: a center spine you scroll down to travel through time.
   Nodes alternate left/right, slide in on scroll, and are color-banded by era.
   Renders from an events array: [{year, date, title, body, category, stat, source}].

   Era is derived from the YEAR (not the research category) so the spine reads as
   a continuous journey through six periods, the way a museum hall would lay it out.

   By default the exhibit opens in 1990 (the GM Impact + the modern revival); the
   deeper 1832–1989 prologue is tucked behind a "go even further back" bubble at
   the top, so the first thing a reader sees is the story that matters most. */

const ERAS = [
  { key: "dawn",       label: "The Electric Dawn",   max: 1907, hint: "1830s–1900s" },
  { key: "gas",        label: "Gasoline Takes Over",  max: 1929, hint: "1908–1929" },
  { key: "darkage",    label: "The Quiet Decades",    max: 1989, hint: "1930–1989" },
  { key: "revival",    label: "False Starts & Revival", max: 2007, hint: "1990–2007" },
  { key: "tesla",      label: "The Tesla Era",        max: 2019, hint: "2008–2019" },
  { key: "mainstream", label: "Going Mainstream",     max: 9999, hint: "2020–today" },
];

const REVEAL_BEFORE = 1990;   // the prologue (everything before this) starts hidden

function eraFor(year) {
  const y = parseInt(String(year), 10);
  for (const e of ERAS) if (y <= e.max) return e;
  return ERAS[ERAS.length - 1];
}

// Build the era headers + alternating nodes for one run of events into `parent`.
// `startIdx` lets the caller offset the left/right alternation so two sections
// (the revealed prologue + the main run) chain cleanly across the pre/main seam.
function buildSection(parent, events, startIdx = 0) {
  let lastEra = null;
  events.forEach((ev, i) => {
    const era = eraFor(ev.year);

    // Era header drops in whenever we cross into a new period.
    if (era.key !== lastEra) {
      const h = document.createElement("div");
      h.className = "tl-era";
      h.dataset.era = era.key;
      h.innerHTML = `<span class="tl-era-hint">${era.hint}</span>
        <span class="tl-era-label">${era.label}</span>`;
      parent.appendChild(h);
      lastEra = era.key;
    }

    const node = document.createElement("div");
    node.className = "tl-node " + ((startIdx + i) % 2 === 0 ? "left" : "right");
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
    parent.appendChild(node);
  });
}

export function renderTimeline(container, events) {
  const sorted = events.slice().sort((a, b) =>
    parseInt(a.year, 10) - parseInt(b.year, 10));
  const pre  = sorted.filter((e) => parseInt(e.year, 10) < REVEAL_BEFORE);
  const main = sorted.filter((e) => parseInt(e.year, 10) >= REVEAL_BEFORE);

  container.innerHTML = "";

  const spine = document.createElement("div");
  spine.className = "tl-spine";
  container.appendChild(spine);

  // "go even further back" bubble — only when there's a prologue to reveal.
  let bubble = null;
  if (pre.length) {
    bubble = document.createElement("button");
    bubble.type = "button";
    bubble.className = "tl-reveal";
    bubble.setAttribute("aria-expanded", "false");
    bubble.innerHTML =
      `<span class="tl-reveal-q">Want to go even further back?</span>
       <span class="tl-reveal-cta">↑ see the pre-1990 origin story</span>`;
    container.appendChild(bubble);
  }

  const mainWrap = document.createElement("div");
  mainWrap.className = "tl-section";
  container.appendChild(mainWrap);
  buildSection(mainWrap, main);
  // main starts at index 0 ("left"); for the seam to chain cleanly, pre must
  // end on "right" — i.e. pre's last index must be odd after offset. With an
  // even-length pre that's offset 0; with an odd-length pre that's offset 1.
  const preOffset = (pre.length % 2 === 0) ? 0 : 1;

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
  const observe = (root) => root.querySelectorAll(".tl-node, .tl-era").forEach((n) => io.observe(n));
  observe(mainWrap);

  // Reveal the prologue: build it, slot it ABOVE the bubble, and scroll the
  // reader up to its start so they travel further back in time.
  if (bubble) {
    bubble.addEventListener("click", () => {
      const preWrap = document.createElement("div");
      preWrap.className = "tl-section tl-section-pre";
      buildSection(preWrap, pre, preOffset);
      container.insertBefore(preWrap, bubble);
      container.classList.add("has-prologue");
      bubble.hidden = true;
      bubble.setAttribute("aria-expanded", "true");
      const deck = document.querySelector("#tab-timeline .deck");
      if (deck) deck.innerHTML = "It led the race in 1900, lost to gasoline, and came back from the dead — and now you’re seeing the whole story, all the way back to 1832.";
      observe(preWrap);
      // Move focus to the first era header for screen-reader continuity.
      const firstEra = preWrap.querySelector(".tl-era");
      if (firstEra) {
        firstEra.setAttribute("tabindex", "-1");
        firstEra.focus({ preventScroll: true });
      }
      const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
      preWrap.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    });
  }

  // A sticky ticker naming the era currently under the viewport center — the
  // "you are here in time" cue. Nodes are re-queried each tick so it follows the
  // prologue once revealed. rAF-throttled.
  const ticker = container.parentElement.querySelector(".tl-ticker");
  if (ticker) {
    let queued = false;
    const update = () => {
      queued = false;
      const nodes = container.querySelectorAll(".tl-node");
      const mid = window.innerHeight / 2;
      let cur = null;
      for (const n of nodes) {
        const r = n.getBoundingClientRect();
        if (r.top <= mid) cur = n; else break;
      }
      // Before any node has crossed the viewport center, point at the first
      // upcoming node so the ticker reflects the next era, not an empty/stale one.
      if (!cur) cur = nodes[0] || null;
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
