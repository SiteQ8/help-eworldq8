/* help.eworldq8.com :: home page
   Search over the guides, the topics as a poster list, the two question
   triage, the services as sheets and the ask form. Language comes from site.js; this re-renders
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

  /* ---------------- topics ----------------
     The six topics, one per poster line, with the picture of each topic's
     world and the count of its guides. */
  const CATS = [
    { key: "computers", en: "Laptops and desktops", ar: "الحواسيب المحمولة والمكتبية", short: { en: "Computers", ar: "الحواسيب" },
      pic: "usb-port.jpg", alt: "USB port solder points on a laptop motherboard" },
    { key: "phones",    en: "Phones and tablets",   ar: "الهواتف والأجهزة اللوحية",   short: { en: "Phones",    ar: "الهواتف" },
      pic: "phone-parts.jpg", alt: "A phone taken apart: the back cover and the main board" },
    { key: "websites",  en: "Websites",             ar: "المواقع الإلكترونية",        short: { en: "Websites",  ar: "المواقع" },
      pic: "servers.jpg", alt: "A rack of servers with network cables plugged in" },
    { key: "files",     en: "Files and backups",    ar: "الملفات والنسخ الاحتياطي",   short: { en: "Files",     ar: "الملفات" },
      pic: "hard-disk.jpg", alt: "An opened hard disk drive showing the platter and the read arm" },
    { key: "network",   en: "Wi-Fi and networks",   ar: "الواي فاي والشبكات",         short: { en: "Wi-Fi",     ar: "الواي فاي" },
      pic: "router-inside.jpg", alt: "The inside of a wireless router: its board and the antenna lead" },
    { key: "safety",    en: "Staying safe online",  ar: "الأمان على الإنترنت",        short: { en: "Scams",     ar: "الاحتيال" },
      pic: "keyboard.jpg", alt: "A laptop keyboard, seen very close" },
  ];

  /* ---------------- services: sheets that stack ---------------- */
  function renderServices() {
    const box = $("#svcs"); box.textContent = "";
    SERVICES.forEach((s) => {
      const li = el("li", "sheet");
      li.dataset.field = ["blue-d", "white", "navy", "paper2", "ink", "paper"][box.children.length % 6];
      const inner = el("div", "sheet-in");
      inner.appendChild(el("h3", null, t(s.name)));
      const body = el("div", "sheet-body");
      body.appendChild(el("p", "sheet-how", ui(s.remote ? "remoteTag" : "handsTag")));
      body.appendChild(el("p", "sheet-p", t(s.blurb)));
      if (s.guides && s.guides.length && guideEntries.length) {
        const ul = el("ul", "sheet-guides");
        s.guides.forEach((slug) => { const e = guideEntries.find((x) => x.slug === slug); if (!e) return;
          const li = el("li"); const ga = el("a", null, t(e.title)); ga.href = "guides/" + slug + "/"; li.appendChild(ga); ul.appendChild(li); });
        if (ul.children.length) body.appendChild(ul);
      }
      inner.appendChild(body);
      if (s.pic) {
        const fig = el("div", "sheet-pic");
        const img = document.createElement("img");
        img.src = "assets/img/" + s.pic; img.alt = s.alt || ""; img.loading = "lazy"; img.decoding = "async";
        img.width = 1000; img.height = 1000;
        fig.appendChild(img); inner.appendChild(fig);
      }
      li.appendChild(inner);
      box.appendChild(li);
    });
  }

  /* ---------------- the poster list, from the search index ----------------
     Pointing at a line brings its picture and its guides up in the frame
     beside the list and dims the other lines. On a touch screen the frame
     is not shown and each line carries its picture inline. */
  let activeTopic = 0;
  function renderTopics(entries) {
    const list = $("#topics"), frame = $("#topic-frame"); if (!list || !frame) return;
    list.textContent = ""; frame.textContent = "";
    const shown = CATS.filter((c) => entries.some((e) => e.cat === c.key));
    shown.forEach((c, i) => {
      const mine = entries.filter((e) => e.cat === c.key);
      const li = el("li", "topic" + (i === activeTopic ? " active" : ""));
      li.setAttribute("data-rise", "");
      const a = el("a"); a.href = "guides/#" + c.key;
      a.setAttribute("aria-label", t(c) + ", " + mine.length + " " + ui(mine.length === 1 ? "topicGuide" : "topicGuides"));
      const main = el("span", "topic-main");
      main.appendChild(el("span", "topic-w", t(c.short)));
      a.appendChild(main);
      a.appendChild(el("span", "topic-n", mine.length + " " + ui(mine.length === 1 ? "topicGuide" : "topicGuides")));
      const show = () => { activeTopic = i; list.classList.add("has-active");
        list.querySelectorAll(".topic").forEach((n, k) => n.classList.toggle("active", k === i));
        frame.querySelectorAll(".frame-panel").forEach((n, k) => n.classList.toggle("on", k === i)); };
      a.addEventListener("pointerenter", show);
      a.addEventListener("focus", show);
      li.appendChild(a); list.appendChild(li);

      const panel = el("div", "frame-panel" + (i === activeTopic ? " on" : ""));
      const fp = el("div", "frame-pic");
      const fimg = document.createElement("img");
      fimg.src = "assets/img/" + c.pic; fimg.alt = c.alt; fimg.loading = "lazy"; fimg.decoding = "async"; fimg.width = 1000; fimg.height = 750;
      fp.appendChild(fimg); panel.appendChild(fp);
      const ul = el("ul", "frame-list");
      mine.forEach((e) => { const l = el("li"); const ga = el("a", null, t(e.title)); ga.href = "guides/" + e.slug + "/"; ga.tabIndex = -1; l.appendChild(ga); ul.appendChild(l); });
      panel.appendChild(ul); frame.appendChild(panel);
    });
    if (!list.dataset.bound) { list.dataset.bound = "1"; list.addEventListener("pointerleave", () => { list.classList.remove("has-active"); }); }
  }
  let guideEntries = [];
  fetch("search.json").then((r) => r.json()).then((d) => { guideEntries = d; renderTopics(d); renderServices(); if (window.HelpRise) window.HelpRise(); }).catch(() => {});

  /* ---------------- contact ---------------- */
  function renderContact() {
    const list = $("#contact-list"); list.textContent = "";
    let shown = 0;
    const add = (labelKey, value, href, ext, cls) => {
      const a = el("a", "contact-item" + (cls ? " " + cls : "")); a.href = href;
      if (ext) { a.rel = "noopener"; a.target = "_blank"; }
      if (cls !== "contact-mail") a.appendChild(el("span", "contact-what", ui(labelKey)));
      const b = el("b"); b.dir = "ltr";
      /* the address is display type; on a phone it may break after the @ */
      const at = value.indexOf("@");
      if (cls === "contact-mail" && at > 0) { b.appendChild(document.createTextNode(value.slice(0, at + 1))); b.appendChild(document.createElement("wbr")); b.appendChild(document.createTextNode(value.slice(at + 1))); }
      else b.textContent = value;
      a.appendChild(b);
      list.appendChild(a); shown++;
    };
    if (CONTACT.email) add("email", CONTACT.email, "mailto:" + CONTACT.email, false, "contact-mail");
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
    renderServices(); renderContact(); renderForm(); renderDevices(); reset();
    renderTopics(guideEntries);
    if (qIn.value) runSearch(qIn.value);
    if (window.HelpRise) window.HelpRise();
  }
  document.addEventListener("lang:applied", renderAll);
  renderAll();
})();
