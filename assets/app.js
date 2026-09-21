/* help.eworldq8.com :: page, language and triage
   Every visible string comes from UI or the content data, so a language
   switch is a re-render rather than a second copy of the page to keep in
   step. Arabic sets dir on the document and the layout follows, because the
   stylesheet uses logical properties throughout. */

(function () {
  "use strict";

  const $ = (s) => document.querySelector(s);
  const el = (t, c, x) => { const n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; };

  let lang = "en";
  try { const v = localStorage.getItem("help-lang"); if (v === "ar" || v === "en") lang = v; }
  catch (e) { /* storage blocked, English it is */ }

  const t = (v) => (v && typeof v === "object" ? (v[lang] || v.en) : v);
  const ui = (k) => t(UI[k]);

  function applyLanguage() {
    const root = document.documentElement;
    root.lang = lang;
    root.dir = lang === "ar" ? "rtl" : "ltr";
    document.body.classList.toggle("is-ar", lang === "ar");

    document.querySelectorAll("[data-t]").forEach((n) => {
      const v = UI[n.dataset.t];
      if (v) n.textContent = t(v);
    });

    const btn = $("#lang");
    btn.textContent = ui("langBtn");
    btn.lang = lang === "ar" ? "en" : "ar";
    btn.setAttribute("aria-label", lang === "ar" ? "Switch to English" : "التبديل إلى العربية");

    renderServices();
    renderContact();
    renderDevices();
    reset();
  }

  function setLanguage(next) {
    lang = next;
    try { localStorage.setItem("help-lang", next); } catch (e) { /* blocked */ }
    applyLanguage();
  }

  /* ---------------- services ---------------- */
  function renderServices() {
    const box = $("#svcs");
    box.textContent = "";
    SERVICES.forEach((s, i) => {
      const li = el("li", "svc" + (i === 0 || i === 3 ? " is-wide" : ""));
      li.appendChild(el("span", "svc-tag" + (s.remote ? " is-remote" : ""),
        ui(s.remote ? "remoteTag" : "handsTag")));
      li.appendChild(el("h3", null, t(s.name)));
      li.appendChild(el("p", null, t(s.blurb)));
      box.appendChild(li);
    });
  }

  /* ---------------- contact ---------------- */
  function renderContact() {
    const list = $("#contact-list");
    list.textContent = "";
    let shown = 0;

    const add = (labelKey, value, href, external) => {
      const a = el("a", "contact-item");
      a.href = href;
      if (external) { a.rel = "noopener"; a.target = "_blank"; }
      a.appendChild(el("span", "contact-what", ui(labelKey)));
      const b = el("b", null, value);
      b.dir = "ltr";                  /* an address or number is never RTL */
      a.appendChild(b);
      list.appendChild(a);
      shown++;
    };

    if (CONTACT.email) add("email", CONTACT.email, "mailto:" + CONTACT.email);
    if (CONTACT.phone) add("phone", CONTACT.phone, "tel:" + CONTACT.phone.replace(/\s+/g, ""));
    if (CONTACT.whatsapp) add("whatsapp", CONTACT.whatsapp,
      "https://wa.me/" + CONTACT.whatsapp.replace(/\D/g, ""), true);

    $("#contact-note").textContent = ui(shown > 1 ? "noteMany" : "noteOne");
  }

  /* ---------------- triage ---------------- */
  const q1 = () => $("#q1"), q2 = () => $("#q2"), out = () => $("#result");
  let device = null;

  function optionButton(label, onPick) {
    const b = el("button", "opt", label);
    b.type = "button";
    b.addEventListener("click", onPick);
    return b;
  }

  function renderDevices() {
    const box = $("#devices");
    box.textContent = "";
    TRIAGE.devices.forEach((d) => box.appendChild(optionButton(t(d.label), () => pickDevice(d.key))));
  }

  function step(n) {
    $("#ask-step").textContent = ui("stepOf") + " " + n + " " + ui("of") + " 2";
  }

  function reset() {
    device = null;
    q1().hidden = false;
    q2().hidden = true;
    out().hidden = true;
    step(1);
  }

  function pickDevice(key) {
    device = key;
    const box = $("#symptoms");
    box.textContent = "";
    TRIAGE.symptoms[key].forEach((s) =>
      box.appendChild(optionButton(t(s.label), () => pickSymptom(s.key, t(s.label)))));
    q1().hidden = true; q2().hidden = false; out().hidden = true;
    step(2);
    q2().scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function pickSymptom(key, label) {
    const a = TRIAGE.answers[device + ":" + key];
    const o = out();
    o.textContent = "";
    if (!a) {
      o.appendChild(el("p", "r-likely", ui("noShortcut")));
      o.hidden = false;
      return;
    }

    const head = el("div", "r-head");
    head.appendChild(el("h3", null, label));
    if (a.urgency !== "low") {
      head.appendChild(el("span", "r-flag r-" + a.urgency,
        ui(a.urgency === "urgent" ? "actNow" : "worthLooking")));
    }
    o.appendChild(head);
    o.appendChild(el("p", "r-likely", t(a.likely)));

    if (a.self && a.self.length) {
      o.appendChild(el("p", "r-sub", ui("tryFirst")));
      const ul = el("ul", "r-list");
      a.self.forEach((s) => ul.appendChild(el("li", null, t(s))));
      o.appendChild(ul);
    }

    o.appendChild(el("p", "r-next", ui(a.bring ? "bringIn" : "sendAddress")));

    const cta = el("a", "btn");
    cta.href = "mailto:" + CONTACT.email + "?subject=" + encodeURIComponent("Help with: " + label);
    cta.textContent = ui("emailAbout");
    o.appendChild(cta);
    o.appendChild(el("p", "r-fine", ui("notDiagnosis")));

    o.hidden = false;
    o.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  $("#back").addEventListener("click", () => {
    q2().hidden = true; out().hidden = true; q1().hidden = false;
    step(1);
    q1().scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
  $("#lang").addEventListener("click", () => setLanguage(lang === "ar" ? "en" : "ar"));

  applyLanguage();
})();
