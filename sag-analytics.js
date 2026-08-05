/* =============================================================================
   ITEM 6 - SAG lightweight engagement tracking
   -----------------------------------------------------------------------------
   Your site already loads Vercel Web Analytics (/_vercel/insights/script.js),
   which gives pageviews + bounce + per-page numbers in the Vercel dashboard.
   That does NOT capture the two things we actually want to move: who takes the
   soft (read-first) path, and how far people scroll. This script adds both as
   custom events, with zero new dependencies.

   INSTALL:
     1) Upload this file to the site root as /sag-analytics.js
     2) Add this line just before </body> on every page (or in your shared
        footer include):
            <script src="/sag-analytics.js" defer></script>
     3) Custom events show up under Vercel Web Analytics > Events. (Custom
        events require the Analytics Plus/Pro tier; if you are on Hobby, the
        calls below are harmless no-ops and you can switch on GA4 instead by
        setting window.gtag - this script forwards to both.)

   WHAT IT SENDS:
     - cta_click      : any element with data-sag="..."  (the soft CTAs, the
                        "See details" links, the "full page" links)
     - scroll_depth   : one event at 25 / 50 / 75 / 100 % of page height
     - briefing_read  : fires on an insight-*.html page after 30s dwell + 50%
                        scroll (a real "they read it" signal, not a bounce)
============================================================================= */
(function () {
  "use strict";

  function send(name, data) {
    try { if (typeof window.va === "function") window.va("event", { name: name, data: data || {} }); } catch (e) {}
    try { if (typeof window.gtag === "function") window.gtag("event", name, data || {}); } catch (e) {}
    // Uncomment to debug in the console:
    // console.log("[sag]", name, data);
  }

  // ---- 1. Named CTA / link clicks -----------------------------------------
  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-sag]");
    if (!el) return;
    send("cta_click", {
      id: el.getAttribute("data-sag"),
      href: el.getAttribute("href") || "",
      page: location.pathname
    });
  }, { passive: true });

  // ---- 2. Scroll depth milestones -----------------------------------------
  var hits = {};
  function onScroll() {
    var doc = document.documentElement;
    var scrolled = (window.scrollY + window.innerHeight) / doc.scrollHeight * 100;
    [25, 50, 75, 100].forEach(function (m) {
      if (!hits[m] && scrolled >= m) {
        hits[m] = true;
        send("scroll_depth", { percent: m, page: location.pathname });
      }
    });
  }
  window.addEventListener("scroll", throttle(onScroll, 400), { passive: true });

  // ---- 3. Briefing "actually read" signal ---------------------------------
  if (/\/insight-/.test(location.pathname)) {
    var read = false, dwell = false, half = false;
    setTimeout(function () { dwell = true; maybeRead(); }, 30000);
    window.addEventListener("scroll", throttle(function () {
      var doc = document.documentElement;
      if ((window.scrollY + window.innerHeight) / doc.scrollHeight >= 0.5) { half = true; maybeRead(); }
    }, 500), { passive: true });
    function maybeRead() {
      if (!read && dwell && half) { read = true; send("briefing_read", { page: location.pathname }); }
    }
  }

  function throttle(fn, ms) {
    var t = 0;
    return function () {
      var now = Date.now();
      if (now - t >= ms) { t = now; fn(); }
    };
  }
})();
