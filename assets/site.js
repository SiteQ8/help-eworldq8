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
})();
