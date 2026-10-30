/* help.eworldq8.com :: shared language handling
   Runs on every page. Two mechanisms: short strings are swapped through
   data-t from UI, and long generated content, the guides, ships both
   languages in the markup as data-lang blocks and this shows the right one.
   Either way the page reads in English with no script at all. */

(function () {
  "use strict";

  let lang = "en";
  try { const v = localStorage.getItem("help-lang"); if (v === "ar" || v === "en") lang = v; }
  catch (e) { /* storage blocked */ }
  /* a link can carry the language, so an Arabic reader can be sent
     straight to the Arabic page: help.eworldq8.com/?lang=ar */
  try {
    const q = new URLSearchParams(location.search).get("lang");
    if (q === "ar" || q === "en") { lang = q; try { localStorage.setItem("help-lang", q); } catch (e) { /* blocked */ } }
  } catch (e) { /* no URL API */ }

  const t = (v) => (v && typeof v === "object" ? (v[lang] || v.en) : v);

  function apply() {
    const root = document.documentElement;
    root.lang = lang;
    root.dir = lang === "ar" ? "rtl" : "ltr";
    document.body.classList.toggle("is-ar", lang === "ar");

    /* UI is a top level const, which is not a window property; checking
       window.UI was always undefined and silently swapped nothing */
    const strings = (typeof UI === "object" && UI) ? UI : {};
    document.querySelectorAll("[data-t]").forEach((n) => {
      const v = strings[n.dataset.t];
      if (v) n.textContent = t(v);
    });
    document.querySelectorAll("[data-lang]").forEach((n) => {
      n.hidden = n.dataset.lang !== lang;
    });

    const btn = document.getElementById("lang");
    if (btn) {
      btn.textContent = lang === "ar" ? "English" : "العربية";
      btn.lang = lang === "ar" ? "en" : "ar";
      btn.setAttribute("aria-label", lang === "ar" ? "Switch to English" : "التبديل إلى العربية");
    }
    document.dispatchEvent(new CustomEvent("lang:applied", { detail: { lang } }));
  }

  window.HelpLang = {
    get: () => lang,
    t: t,
    set: (next) => {
      lang = next;
      try { localStorage.setItem("help-lang", next); } catch (e) { /* blocked */ }
      apply();
    },
  };

  const btn = document.getElementById("lang");
  if (btn) btn.addEventListener("click", () => window.HelpLang.set(lang === "ar" ? "en" : "ar"));
  apply();

  /* ---------------- entrance, once, as each part enters ----------------
     Parts are marked data-rise and start translated 20px down at zero
     opacity, only when the html element carries .js, so a page with no
     script shows everything. */
  const rise = () => {
    const els = document.querySelectorAll("[data-rise], .hero-pic, .guide-pic");
    if (!("IntersectionObserver" in window)) { els.forEach((e) => e.classList.add("in")); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
    els.forEach((e) => io.observe(e));
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", rise); else rise();
  window.HelpRise = rise;

  /* ---------------- picture credits, in the footer ---------------- */
  const cred = document.getElementById("credits");
  if (cred) {
    fetch(document.querySelector('link[rel="stylesheet"][href$="styles.css"]').getAttribute("href").replace("styles.css", "credits.json"))
      .then((r) => r.json())
      .then((d) => {
        const items = Array.isArray(d) ? d : (d.items || []);
        if (!items.length) return;
        const t = (v) => window.HelpLang.t(v);
        /* one line, the source named once: Title by Author (licence); ... */
        const one = (i) => (i.title || i.file) + (i.creator ? " by " + i.creator : "") + (i.license ? " (" + i.license + ")" : "");
        const render = () => {
          cred.textContent = (typeof UI === "object" && UI.credits ? t(UI.credits) : "Pictures, via Wikimedia Commons") + ": " +
            items.map(one).join("; ") + ".";
        };
        render();
        document.addEventListener("lang:applied", render);
      }).catch(() => {});
  }
})();
