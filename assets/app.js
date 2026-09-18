/* help.eworldq8.com :: page and triage
   The triage is a two step decision tree. It says "usually" rather than
   "is", because a page cannot diagnose a machine it cannot see, and telling
   somebody their drive has failed when it has not is worse than telling them
   nothing. */

(function () {
  "use strict";

  const $ = (s) => document.querySelector(s);
  const el = (t, c, x) => { const n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; };

  /* ---------------- services ---------------- */
  const svcs = $("#svcs");
  SERVICES.forEach((s) => {
    const li = el("li", "svc");
    li.appendChild(el("h3", null, s.name));
    li.appendChild(el("p", null, s.blurb));
    svcs.appendChild(li);
  });

  /* ---------------- contact ---------------- */
  const list = $("#contact-list");
  const shown = [];
  if (CONTACT.email) {
    const a = el("a", "contact-item");
    a.href = "mailto:" + CONTACT.email;
    a.appendChild(el("span", "contact-what", "Email"));
    a.appendChild(el("b", null, CONTACT.email));
    list.appendChild(a); shown.push("email");
  }
  if (CONTACT.phone) {
    const a = el("a", "contact-item");
    a.href = "tel:" + CONTACT.phone.replace(/\s+/g, "");
    a.appendChild(el("span", "contact-what", "Phone"));
    a.appendChild(el("b", null, CONTACT.phone));
    list.appendChild(a); shown.push("phone");
  }
  if (CONTACT.whatsapp) {
    const a = el("a", "contact-item");
    a.href = "https://wa.me/" + CONTACT.whatsapp.replace(/\D/g, "");
    a.rel = "noopener"; a.target = "_blank";
    a.appendChild(el("span", "contact-what", "WhatsApp"));
    a.appendChild(el("b", null, CONTACT.whatsapp));
    list.appendChild(a); shown.push("whatsapp");
  }
  $("#contact-note").textContent = shown.length > 1
    ? "Whichever is easiest. Email gets you a written answer you can keep."
    : "Email is the way to reach us at the moment. A phone number is on its way.";

  /* ---------------- triage ---------------- */
  const q1 = $("#q1"), q2 = $("#q2"), out = $("#result");
  let device = null;

  function optionButton(label, onPick) {
    const b = el("button", "opt", label);
    b.type = "button";
    b.addEventListener("click", onPick);
    return b;
  }

  TRIAGE.devices.forEach((d) => {
    $("#devices").appendChild(optionButton(d.label, () => pickDevice(d.key)));
  });

  function pickDevice(key) {
    device = key;
    const box = $("#symptoms");
    box.textContent = "";
    TRIAGE.symptoms[key].forEach((s) => {
      box.appendChild(optionButton(s.label, () => pickSymptom(s.key, s.label)));
    });
    q1.hidden = true; q2.hidden = false; out.hidden = true;
    q2.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function pickSymptom(key, label) {
    const a = TRIAGE.answers[device + ":" + key];
    out.textContent = "";
    if (!a) {
      out.appendChild(el("p", "r-likely", "We do not have a shortcut for that one. Send us a message and describe it in your own words."));
      out.hidden = false;
      return;
    }

    const head = el("div", "r-head");
    head.appendChild(el("h3", null, label));
    if (a.urgency !== "low") {
      head.appendChild(el("span", "r-flag r-" + a.urgency,
        a.urgency === "urgent" ? "Act now" : "Worth looking at"));
    }
    out.appendChild(head);

    out.appendChild(el("p", "r-likely", a.likely));

    if (a.self && a.self.length) {
      out.appendChild(el("p", "r-sub", "Try this first"));
      const ul = el("ul", "r-list");
      a.self.forEach((s) => ul.appendChild(el("li", null, s)));
      out.appendChild(ul);
    }

    out.appendChild(el("p", "r-next", a.bring
      ? "If that does not sort it, bring it in and we will look at it properly."
      : "Send us the address and we will check it and tell you what we find."));

    const cta = el("a", "btn");
    cta.href = "mailto:" + CONTACT.email + "?subject=" + encodeURIComponent("Help with: " + label);
    cta.textContent = "Email us about this";
    out.appendChild(cta);

    out.appendChild(el("p", "r-fine",
      "This is what the problem usually turns out to be, not a diagnosis. "
      + "Two machines can show the same symptom for completely different reasons."));

    out.hidden = false;
    out.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  $("#back").addEventListener("click", () => {
    q2.hidden = true; out.hidden = true; q1.hidden = false;
    q1.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
})();
