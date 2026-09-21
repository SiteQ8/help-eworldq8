/* help.eworldq8.com :: home page
   Search over the guides, the category tiles, the two question triage, the
   services and the ask form. Language comes from site.js; this re-renders
   when it changes. */

(function () {
  "use strict";

  const $ = (s) => document.querySelector(s);
  const el = (t, c, x) => { const n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; };
  const L = () => window.HelpLang.get();
  const t = (v) => window.HelpLang.t(v);
  const ui = (k) => t(UI[k]);

  /* ---------------- search ----------------
     A small client side index. Matching is by word, in both languages at
     once, so a person can type in either and get the same guide. */
  let index = [];
  fetch("search.json").then((r) => r.json()).then((d) => { index = d; }).catch(() => {});

  const norm = (s) => s.toLowerCase()
    .replace(/[\u064B-\u0652\u0640]/g, "")          /* strip Arabic diacritics and tatweel */
    .replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي")
    .replace(/[^\p{L}\p{N}\s]/gu, " ");
  const words = (s) => norm(s).split(/\s+/).filter((w) => w.length > 1);

  function score(entry, qWords) {
    const hay = words([entry.title.en, entry.title.ar, entry.summary.en, entry.summary.ar,
                       entry.keywords.en, entry.keywords.ar].join(" "));
    const titleW = words(entry.title.en + " " + entry.title.ar);
    let s = 0;
    for (const q of qWords) {
      if (titleW.some((w) => w.startsWith(q))) s += 3;
      else if (hay.some((w) => w.startsWith(q))) s += 1;
    }
    return s;
  }

  function runSearch(q) {
    const hits = $("#hits");
    hits.textContent = "";
    const qw = words(q);
    if (!qw.length) { hits.hidden = true; return; }
    const ranked = index.map((e) => [score(e, qw), e]).filter((x) => x[0] > 0)
      .sort((a, b) => b[0] - a[0]).slice(0, 5);
    if (!ranked.length) {
      hits.appendChild(el("li", "hit-none", ui("searchNone")));
    } else {
      ranked.forEach(([, e]) => {
        const li = el("li", "hit");
        const a = el("a"); a.href = "guides/" + e.slug + "/";
        a.appendChild(el("span", "hit-title", t(e.title)));
        a.appendChild(el("span", "hit-sum", t(e.summary)));
        li.appendChild(a);
        hits.appendChild(li);
      });
    }
    hits.hidden = false;
  }
  const qIn = $("#q");
  qIn.addEventListener("input", () => runSearch(qIn.value));
  $("#search").addEventListener("submit", (e) => { e.preventDefault(); runSearch(qIn.value); });

  /* ---------------- categories ---------------- */
  const COUNTS = {};
  fetch("search.json").then((r) => r.json()).then((d) => {
    d.forEach((e) => { COUNTS[e.cat] = (COUNTS[e.cat] || 0) + 1; });
    renderCats();
  }).catch(renderCats);

  const CATS = [
    { key: "computers", en: "Laptops and desktops", ar: "الحواسيب المحمولة والمكتبية" },
    { key: "phones",    en: "Phones and tablets",   ar: "الهواتف والأجهزة اللوحية" },
    { key: "websites",  en: "Websites",             ar: "المواقع الإلكترونية" },
    { key: "files",     en: "Files and backups",    ar: "الملفات والنسخ الاحتياطي" },
    { key: "network",   en: "Wi-Fi and networks",   ar: "الواي فاي والشبكات" },
    { key: "safety",    en: "Staying safe online",  ar: "الأمان على الإنترنت" },
  ];
  function renderCats() {
    const box = $("#cats"); box.textContent = "";
    CATS.forEach((c) => {
      const li = el("li", "cat");
      const a = el("a"); a.href = "guides/#" + c.key;
      a.appendChild(el("span", "cat-name", t(c)));
      const n = COUNTS[c.key];
      if (n) a.appendChild(el("span", "cat-n", n + " " + ui("guideCount")));
      li.appendChild(a); box.appendChild(li);
    });
  }

  /* ---------------- services ---------------- */
  function renderServices() {
    const box = $("#svcs"); box.textContent = "";
    SERVICES.forEach((s, i) => {
      const li = el("li", "svc" + (i === 0 || i === 3 ? " is-wide" : ""));
      li.appendChild(el("span", "svc-tag" + (s.remote ? " is-remote" : ""), ui(s.remote ? "remoteTag" : "handsTag")));
      li.appendChild(el("h3", null, t(s.name)));
      li.appendChild(el("p", null, t(s.blurb)));
      box.appendChild(li);
    });
  }

  /* ---------------- contact ---------------- */
  function renderContact() {
    const list = $("#contact-list"); list.textContent = "";
    let shown = 0;
    const add = (labelKey, value, href, ext) => {
      const a = el("a", "contact-item"); a.href = href;
      if (ext) { a.rel = "noopener"; a.target = "_blank"; }
      a.appendChild(el("span", "contact-what", ui(labelKey)));
      const b = el("b", null, value); b.dir = "ltr"; a.appendChild(b);
      list.appendChild(a); shown++;
    };
    if (CONTACT.email) add("email", CONTACT.email, "mailto:" + CONTACT.email);
    if (CONTACT.phone) add("phone", CONTACT.phone, "tel:" + CONTACT.phone.replace(/\s+/g, ""));
    if (CONTACT.whatsapp) add("whatsapp", CONTACT.whatsapp, "https://wa.me/" + CONTACT.whatsapp.replace(/\D/g, ""), true);
    $("#contact-note").textContent = ui(shown > 1 ? "noteMany" : "noteOne");
  }

  /* ---------------- ask form ----------------
     No backend. The form composes an email with what was typed, so nothing
     leaves the page until the person presses send in their own mail app. */
  function renderForm() {
    const sel = $("#f-device"); sel.textContent = "";
    ui("fDeviceOpt").split("|").forEach((o) => { const op = el("option", null, o); op.value = o; sel.appendChild(op); });
    document.querySelectorAll("[data-ph]").forEach((n) => { n.placeholder = ui(n.dataset.ph); });
  }
  /* composing is kept separate from navigating so it can be checked without
     stubbing window.location, which Chromium will not allow */
  function composeAsk(f) {
    const what = f.what.value.trim();
    if (what.length < 3) return null;
    const subject = "Help with: " + f.device.value;
    const body = [
      (f.name.value.trim() ? "From: " + f.name.value.trim() : ""),
      "About: " + f.device.value, "",
      "What is happening:", what, "",
      "Sent from help.eworldq8.com",
    ].filter((x, i, a) => x !== "" || a[i - 1] !== "").join("\n");
    return "mailto:" + CONTACT.email + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
  }
  window.__composeAsk = composeAsk;

  $("#askform").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = e.target, err = $("#form-err");
    const href = composeAsk(f);
    if (!href) { err.hidden = false; f.what.focus(); return; }
    err.hidden = true;
    location.href = href;
  });

  /* ---------------- triage ---------------- */
  const q1 = () => $("#q1"), q2 = () => $("#q2"), out = () => $("#result");
  let device = null;
  const step = (n) => { $("#ask-step").textContent = ui("stepOf") + " " + n + " " + ui("of") + " 2"; };
  const optionButton = (label, onPick) => { const b = el("button", "opt", label); b.type = "button"; b.addEventListener("click", onPick); return b; };

  function renderDevices() {
    const box = $("#devices"); box.textContent = "";
    TRIAGE.devices.forEach((d) => box.appendChild(optionButton(t(d.label), () => pickDevice(d.key))));
  }
  function reset() { device = null; q1().hidden = false; q2().hidden = true; out().hidden = true; step(1); }
  function pickDevice(key) {
    device = key;
    const box = $("#symptoms"); box.textContent = "";
    TRIAGE.symptoms[key].forEach((s) => box.appendChild(optionButton(t(s.label), () => pickSymptom(s.key, t(s.label)))));
    q1().hidden = true; q2().hidden = false; out().hidden = true; step(2);
    q2().scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
  function pickSymptom(key, label) {
    const a = TRIAGE.answers[device + ":" + key];
    const o = out(); o.textContent = "";
    if (!a) { o.appendChild(el("p", "r-likely", ui("noShortcut"))); o.hidden = false; return; }
    const head = el("div", "r-head");
    head.appendChild(el("h3", null, label));
    if (a.urgency !== "low") head.appendChild(el("span", "r-flag r-" + a.urgency, ui(a.urgency === "urgent" ? "actNow" : "worthLooking")));
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
  $("#back").addEventListener("click", () => { q2().hidden = true; out().hidden = true; q1().hidden = false; step(1); });

  /* ---------------- render on language change ---------------- */
  function renderAll() {
    renderCats(); renderServices(); renderContact(); renderForm(); renderDevices(); reset();
    if (qIn.value) runSearch(qIn.value);
  }
  document.addEventListener("lang:applied", renderAll);
  renderAll();
})();
