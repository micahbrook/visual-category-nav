/* Category Launcher and Black Friday Launcher: the rail's script, as a file for CMSes that strip or rewrite inline
   scripts. Load it once per page: <script src="/media/wysiwyg/visual-category-nav/category-launcher.js" defer></script> */
(() => {
  /* Safe to load more than once, and before or after the markup: it sets up every .hn-vcn on the page that isn't set up yet,
     straight away, when the page has loaded, and whenever one is added later. window.hnVcnInit() does the same by hand. */
  if (window.hnVcnInit) { window.hnVcnInit(); return; }
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  const init = (nav) => {
    const list = nav.querySelector(".hn-vcn__list");
    const prev = nav.querySelector(".hn-vcn__arrow--prev");
    const next = nav.querySelector(".hn-vcn__arrow--next");
    if (nav.dataset.vcnReady || !list || !prev || !next) return;
    nav.dataset.vcnReady = "1";
    const update = () => {
      const max = list.scrollWidth - list.clientWidth;
      const atStart = list.scrollLeft <= 1, atEnd = list.scrollLeft >= max - 1;
      if (atStart && document.activeElement === prev) next.focus();
      if (atEnd && document.activeElement === next) prev.focus();
      prev.hidden = atStart;
      next.hidden = atEnd;
    };
    /* An arrow pages by every whole tile in view but one, so one tile stays for context. The stops are fixed (the start, one page, */
    /* two pages … then the end) and each is a tile edge, so the rail always lands on a whole tile and Back retraces Next exactly. */
    let startX = 0, startLeft = 0, down = false, dragged = false;
    const page = (dir) => {
      const cs = getComputedStyle(list), item = list.querySelector(".hn-vcn__item");
      const gap = parseFloat(cs.columnGap) || 0, step = item.offsetWidth + gap;
      const view = list.clientWidth - (parseFloat(cs.scrollPaddingLeft) || 0) - (parseFloat(cs.scrollPaddingRight) || 0);
      const by = Math.max(1, Math.floor((view + gap) / step) - 1) * step;
      const max = list.scrollWidth - list.clientWidth, at = list.scrollLeft, stops = [];
      for (let x = 0; x < max - 1; x += by) stops.push(x);
      stops.push(max);
      const to = dir > 0 ? stops.find((x) => x > at + 1) : stops.reverse().find((x) => x < at - 1);
      if (to !== undefined) list.scrollTo({ left: to, behavior: reduce.matches ? "auto" : "smooth" });
    };
    /* Fullstory: named events for tiles, arrows and the first scroll, sent only when Fullstory is on the page */
    /* (Browser API v2, FS("trackEvent"), or v1's FS.event). Fullstory also records the clicks themselves; the */
    /* data-fs-element, data-category and data-position attributes give its element definitions stable selectors. */
    const track = (name, props) => {
      const fs = window.FS;
      if (typeof fs !== "function") return;
      const properties = Object.assign({ version: nav.dataset.version || nav.dataset.concept }, props);
      try { if (typeof fs.event === "function") fs.event(name, properties); else fs("trackEvent", { name, properties }); } catch (e) {}
    };
    /* Skip link: move focus past the rail (browsers, Safari especially, don't always move focus to an in-page target) */
    const skip = nav.querySelector(".hn-vcn__skip"), end = nav.querySelector(".hn-vcn__end");
    if (skip && end) skip.addEventListener("click", (e) => { e.preventDefault(); end.focus(); });
    prev.addEventListener("click", () => { track("Category Launcher Arrow Clicked", { direction: "previous" }); page(-1); });
    next.addEventListener("click", () => { track("Category Launcher Arrow Clicked", { direction: "next" }); page(1); });
    list.addEventListener("click", (e) => {
      const a = e.target.closest(".hn-vcn__tile");
      if (a) track("Category Launcher Tile Clicked", { category: a.dataset.category, position: +a.dataset.position, href: a.getAttribute("href") });
    });
    let scrolled = false;
    list.addEventListener("scroll", update, { passive: true });
    list.addEventListener("scroll", () => {
      if (scrolled) return;
      scrolled = true; track("Category Launcher Scrolled", { method: down ? "drag" : "scroll" });
    }, { passive: true });
    /* A tile that takes keyboard focus under an arrow, or past the rail's edge, is moved into view a whole tile at a time so the snap holds, */
    /* and the focus ring is never covered (WCAG 2.4.11, and 2.4.12 where the rail allows). */
    list.addEventListener("focusin", (e) => {
      const item = e.target.closest(".hn-vcn__item");
      if (!item) return;
      requestAnimationFrame(() => {
        const step = item.offsetWidth + (parseFloat(getComputedStyle(list).columnGap) || 0);
        for (let i = 0; i < 4; i++) {
          const r = item.getBoundingClientRect(), v = list.getBoundingClientRect();
          const hit = [prev, next].find((b) => { if (b.hidden || !b.offsetWidth) return false; const q = b.getBoundingClientRect(); return r.left < q.right && r.right > q.left; });
          const dir = hit ? (hit === prev ? -1 : 1) : r.left < v.left - 1 ? -1 : r.right > v.right + 1 ? 1 : 0;
          if (!dir) break;
          list.scrollLeft += dir * step;
          update();
        }
      });
    });
    if ("ResizeObserver" in window) new ResizeObserver(update).observe(list);
    else window.addEventListener("resize", update);
    /* Drag to scroll with a mouse; touch and trackpads scroll natively. A drag never opens a tile. */
    startX = 0; startLeft = 0; down = false; dragged = false;
    list.addEventListener("pointerdown", (e) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      down = true; dragged = false; startX = e.clientX; startLeft = list.scrollLeft;
    });
    list.addEventListener("pointermove", (e) => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (!dragged && Math.abs(dx) > 5) { dragged = true; nav.classList.add("hn-vcn--dragging"); list.setPointerCapture(e.pointerId); }
      if (dragged) list.scrollLeft = startLeft - dx;
    });
    const release = () => { down = false; nav.classList.remove("hn-vcn--dragging"); };
    list.addEventListener("pointerup", release);
    list.addEventListener("pointercancel", release);
    /* Links and images never start the browser's own drag, even if the CMS drops their draggable="false" */
    list.addEventListener("dragstart", (e) => e.preventDefault());
    list.addEventListener("click", (e) => { if (dragged) { e.preventDefault(); e.stopPropagation(); dragged = false; } }, true);
    update();
  };
  let queued = false;
  const scan = () => { queued = false; document.querySelectorAll(".hn-vcn").forEach(init); };
  window.hnVcnInit = scan;
  scan();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", scan);
  window.addEventListener("load", scan);
  if ("MutationObserver" in window) new MutationObserver(() => { if (!queued) { queued = true; requestAnimationFrame(scan); } }).observe(document.documentElement, { childList: true, subtree: true });
})();
