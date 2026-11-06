#!/usr/bin/env python3
"""
Generates the guide pages, the guides index and the search index from
content/guides.py. The output is committed, so GitHub Pages serves plain
files and nothing has to run at deploy time to make a guide exist.

    python3 tools/build.py
"""
import json
import pathlib
import re
import sys
from html import escape as esc

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "content"))
from guides import CATEGORIES, GUIDES  # noqa: E402

BASE = "https://help.eworldq8.com/"
CAT = {c["key"]: c for c in CATEGORIES}
DIM = {'hard-disk.jpg': (1024, 1280), 'small-dust.jpg': (1920, 822), 'thermal-paste.jpg': (1000, 1000), 'network-cables.jpg': (1000, 1000), 'usb-port.jpg': (1000, 1000),
       'keyboard.jpg': (1000, 1000), 'router-inside.jpg': (1000, 1000), 'servers.jpg': (1000, 1000), 'phone-parts.jpg': (1000, 739), 'rj45.jpg': (1000, 1000)}
PIC = {
    'laptop-will-not-turn-on': ('usb-port.jpg', 'USB port solder points on a laptop motherboard'),
    'computer-is-very-slow': ('hard-disk.jpg', 'An opened hard disk drive showing the platter and the read arm'),
    'laptop-overheating': ('small-dust.jpg', 'Dust packed into the grille of a laptop cooling fan'),
    'liquid-spilled-on-laptop': ('keyboard.jpg', 'A laptop keyboard, seen very close'),
    'blue-screen-and-restarts': ('thermal-paste.jpg', 'The underside of a CPU cooler with thermal paste applied'),
    'recover-deleted-files': ('hard-disk.jpg', 'An opened hard disk drive showing the platter and the read arm'),
    'set-up-a-backup': ('hard-disk.jpg', 'An opened hard disk drive showing the platter and the read arm'),
    'wifi-keeps-dropping': ('router-inside.jpg', 'The inside of a wireless router: its board and the antenna lead'),
    'phone-storage-full': ('phone-parts.jpg', 'A phone taken apart: the back cover and the main board'),
    'phone-battery-draining': ('phone-parts.jpg', 'A phone taken apart: the back cover and the main board'),
    'website-is-down': ('servers.jpg', 'A rack of servers with network cables plugged in'),
    'is-my-website-secure': ('rj45.jpg', 'The contacts of a network plug, seen very close'),
    'website-is-slow': ('network-cables.jpg', 'Network cables plugged into the back of a router'),
    'spotting-a-scam-message': ('keyboard.jpg', 'A laptop keyboard, seen very close'),
}

UI = {
    "backToGuides": {"en": "All guides", "ar": "كلّ الأدلّة"},
    "stopHeading":  {"en": "When to stop and ask", "ar": "متى تتوقّف وتسأل"},
    "stepsHeading": {"en": "What to do", "ar": "ما ينبغي فعله"},
    "askAbout":     {"en": "Ask us about this", "ar": "اسألنا عن هذا"},
    "urgent":       {"en": "Act now", "ar": "تصرّف الآن"},
    "normal":       {"en": "Worth looking at", "ar": "يستحقّ الفحص"},
    "guidesTitle":  {"en": "Guides", "ar": "الأدلّة"},
    "guidesLede":   {"en": "Written to be followed on your own, in the order you should actually do things. Every one ends with when to stop and ask.",
                     "ar": "كُتبت لتتّبعها بنفسك، بالترتيب الذي ينبغي أن تفعل به الأمور فعلاً، وكلّ دليل ينتهي بمتى تتوقّف وتسأل."},
    "notDiagnosis": {"en": "These are the usual causes and the safe order to check them, not a diagnosis of your machine. If a step does not match what you are seeing, stop and ask.",
                     "ar": "هذه هي الأسباب المعتادة والترتيب الآمن لفحصها، وليست تشخيصاً لجهازك، فإن لم تطابق خطوة ما تراه فتوقّف واسأل."},
    "more":         {"en": "Keep reading", "ar": "تابع القراءة"},
}


def related(g, n=3):
    """The guides to read next: the same topic first, then the rest in site
    order, each with a different picture from the page's own and from each
    other so the strip reads as three subjects rather than one repeated."""
    others = [o for o in GUIDES if o["slug"] != g["slug"]]
    others.sort(key=lambda o: 0 if o["category"] == g["category"] else 1)
    used = {PIC.get(g["slug"], ("hard-disk.jpg",))[0]}
    picked = []
    for o in others:
        p = PIC.get(o["slug"], ("hard-disk.jpg",))[0]
        if p in used:
            continue
        picked.append(o)
        used.add(p)
        if len(picked) == n:
            break
    for o in others:                      # only if the pictures ran out
        if len(picked) == n:
            break
        if o not in picked:
            picked.append(o)
    return picked


def shell(title_en, title_ar, body, depth, description_en, rel=""):
    """The chrome every page shares. depth is how many folders deep the page
    sits, so asset paths stay relative and the site works at any base."""
    up = "../" * depth
    return f"""<!doctype html>
<html lang="en" dir="ltr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(title_en)} :: eWorld Help</title>
<meta name="description" content="{esc(description_en)}">
<link rel="canonical" href="{BASE}{rel}">
<meta name="theme-color" content="#f4f6f9">
<link rel="icon" href="{up}assets/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=IBM+Plex+Sans+Arabic:wght@400;600;700&display=swap">
<link rel="stylesheet" href="{up}assets/styles.css">
<script>document.documentElement.classList.add('js')</script>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>

<header class="top" id="top" data-field="paper">
  <div class="shell top-in">
    <a class="brand" href="{up}./" aria-label="eWorld Help">
      <img class="logo-dark" src="{up}assets/img/logo.png" srcset="{up}assets/img/logo@2x.png 2x" alt="eWorld" width="520" height="101">
      <img class="logo-light" src="{up}assets/img/logo-white.png" alt="" aria-hidden="true" width="520" height="101">
      <span class="brand-help" data-t="brandHelp">Help</span>
    </a>
    <nav class="top-nav" aria-label="Primary">
      <a class="top-link" href="{up}guides/" data-t="navGuides">Guides</a>
      <button class="lang" id="lang" type="button" lang="ar">العربية</button>
      <a class="cta" href="{up}./#contact" data-t="getHelp">Get help</a>
    </nav>
  </div>
</header>

<main id="main" class="page ch" data-field="paper">
{body}
</main>

<footer class="ch foot" data-field="ink">
  <div class="shell">
    <nav class="mark" aria-label="Footer">
      <a href="{up}guides/" data-t="navGuides">Guides</a>
      <a href="{up}./#ask" data-t="askH">Two questions.</a>
      <a href="{up}./#contact" data-t="askFormKicker">Ask us</a>
    </nav>
    <div class="foot-grid">
      <img class="foot-logo" src="{up}assets/img/logo-white.png" alt="eWorld" width="520" height="101" loading="lazy">
      <p class="foot-note" data-t="footPlace">Online anywhere. In person by arrangement.</p>
    </div>
    <p class="foot-credit" id="credits"></p>
    <p class="foot-copy">&copy; 2026 eWorld</p>
  </div>
</footer>

<script src="{up}assets/data.js"></script>
<script src="{up}assets/site.js"></script>
</body>
</html>
"""


def title(v):
    """One h1 per page, carrying both languages as spans; the hidden one is
    out of the accessibility tree, and the heading itself always has size."""
    return (f'<h1><span data-lang="en">{esc(v["en"])}</span>'
            f'<span data-lang="ar" hidden>{esc(v["ar"])}</span></h1>')


def both(v, cls="", tag="p", rise=False):
    """Render a bilingual value as two blocks; site.js shows the right one."""
    c = f' class="{cls}"' if cls else ""
    r = " data-rise" if rise else ""
    return (f'<{tag}{c} data-lang="en"{r}>{esc(v["en"])}</{tag}>'
            f'<{tag}{c} data-lang="ar" hidden{r}>{esc(v["ar"])}</{tag}>')


def guide_page(g):
    cat = CAT[g["category"]]
    flag = ""
    if g["urgency"] != "low":
        flag = (f'<span class="flag flag-{g["urgency"]}" data-lang="en">{esc(UI[g["urgency"]]["en"])}</span>'
                f'<span class="flag flag-{g["urgency"]}" data-lang="ar" hidden>{esc(UI[g["urgency"]]["ar"])}</span>')
    steps_en = "".join(f"<li data-rise>{esc(s['en'])}</li>" for s in g["steps"])
    steps_ar = "".join(f"<li data-rise>{esc(s['ar'])}</li>" for s in g["steps"])
    subject_en = "Help with: " + g["title"]["en"]
    pic, alt = PIC.get(g["slug"], ("hard-disk.jpg", "An opened hard disk drive"))
    tiles = "".join(f"""
      <li class="ptile" data-rise>
        <a href="../{o['slug']}/">
          <span class="ptile-pic"><img src="../../assets/img/{PIC[o['slug']][0]}" alt="{esc(PIC[o['slug']][1])}" width="{DIM[PIC[o['slug']][0]][0]}" height="{DIM[PIC[o['slug']][0]][1]}" loading="lazy" decoding="async"></span>
          <span class="ptile-t" data-lang="en">{esc(o['title']['en'])}<span class="ptile-s">{esc(o['summary']['en'])}</span></span>
          <span class="ptile-t" data-lang="ar" hidden>{esc(o['title']['ar'])}<span class="ptile-s">{esc(o['summary']['ar'])}</span></span>
        </a>
      </li>""" for o in related(g))
    body = f"""
  <div class="guide-stage">
  <article class="guide">
    <div class="guide-head">
      {title(g["title"])}
      {flag}
    </div>
    <p class="crumbs" data-rise>
      <a href="../" data-lang="en">{esc(UI["backToGuides"]["en"])}</a>
      <a href="../" data-lang="ar" hidden>{esc(UI["backToGuides"]["ar"])}</a>
      <span data-lang="en">{esc(cat["name"]["en"])}</span>
      <span data-lang="ar" hidden>{esc(cat["name"]["ar"])}</span>
    </p>
    {both(g["summary"], "guide-lede", rise=True)}

    <h2 data-lang="en" data-rise>{esc(UI["stepsHeading"]["en"])}</h2>
    <h2 data-lang="ar" hidden data-rise>{esc(UI["stepsHeading"]["ar"])}</h2>
    <ol class="guide-steps" data-lang="en">{steps_en}</ol>
    <ol class="guide-steps" data-lang="ar" hidden>{steps_ar}</ol>

    <aside class="guide-stop" data-rise>
      <h2 data-lang="en">{esc(UI["stopHeading"]["en"])}</h2>
      <h2 data-lang="ar" hidden>{esc(UI["stopHeading"]["ar"])}</h2>
      {both(g["stop"], rise=True)}
      <a class="btn" href="mailto:mail@eworldq8.com?subject={esc(subject_en)}" data-lang="en">{esc(UI["askAbout"]["en"])}</a>
      <a class="btn" href="mailto:mail@eworldq8.com?subject={esc(subject_en)}" data-lang="ar" hidden>{esc(UI["askAbout"]["ar"])}</a>
    </aside>

    {both(UI["notDiagnosis"], "guide-fine", rise=True)}
  </article>
  <figure class="guide-pic">
    <img src="../../assets/img/{pic}" alt="{esc(alt)}" width="{DIM[pic][0]}" height="{DIM[pic][1]}" decoding="async">
  </figure>
  </div>

  <section class="shell more" aria-labelledby="more-h">
    <h2 id="more-h" data-lang="en" data-rise>{esc(UI["more"]["en"])}</h2>
    <h2 data-lang="ar" hidden data-rise>{esc(UI["more"]["ar"])}</h2>
    <ul class="more-tiles">{tiles}
    </ul>
  </section>
"""
    return shell(g["title"]["en"], g["title"]["ar"], body, 2, g["summary"]["en"], f"guides/{g['slug']}/")


def guides_index():
    groups = []
    for c in CATEGORIES:
        items = [g for g in GUIDES if g["category"] == c["key"]]
        if not items:
            continue
        tiles = "".join(f"""
        <li class="ptile ptile-row" data-rise>
          <a href="{g['slug']}/">
            <span class="ptile-pic"><img src="../assets/img/{PIC[g['slug']][0]}" alt="{esc(PIC[g['slug']][1])}" width="{DIM[PIC[g['slug']][0]][0]}" height="{DIM[PIC[g['slug']][0]][1]}" loading="lazy" decoding="async"></span>
            <span class="ptile-t" data-lang="en">{esc(g['title']['en'])}<span class="ptile-s">{esc(g['summary']['en'])}</span></span>
            <span class="ptile-t" data-lang="ar" hidden>{esc(g['title']['ar'])}<span class="ptile-s">{esc(g['summary']['ar'])}</span></span>
          </a>
        </li>""" for g in items)
        groups.append(f"""
    <section class="gset" id="{c['key']}">
      {both(c['name'], 'gset-h', 'h2', rise=True)}
      <ul class="gtiles">{tiles}
      </ul>
    </section>""")
    body = f"""
  <section class="shell guides-top">
    {title(UI["guidesTitle"])}
    {both(UI["guidesLede"], "lede", rise=True)}
  </section>
  <div class="shell gindex">{''.join(groups)}
  </div>
"""
    return shell("Guides", "الأدلّة", body, 1, UI["guidesLede"]["en"], "guides/")


def search_index():
    out = []
    for g in GUIDES:
        out.append({
            "slug": g["slug"], "cat": g["category"],
            "title": g["title"], "summary": g["summary"], "keywords": g["keywords"],
        })
    return out


def main():
    gdir = ROOT / "guides"
    gdir.mkdir(exist_ok=True)
    written = 0
    for g in GUIDES:
        assert re.fullmatch(r"[a-z0-9-]+", g["slug"]), f"bad slug {g['slug']}"
        d = gdir / g["slug"]
        d.mkdir(exist_ok=True)
        (d / "index.html").write_text(guide_page(g), encoding="utf-8")
        written += 1
    (gdir / "index.html").write_text(guides_index(), encoding="utf-8")
    (ROOT / "search.json").write_text(
        json.dumps(search_index(), ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    # remove pages for guides that no longer exist, so nothing stale is served
    live = {g["slug"] for g in GUIDES}
    for d in gdir.iterdir():
        if d.is_dir() and d.name not in live:
            for f in d.iterdir(): f.unlink()
            d.rmdir()
            print(f"  removed stale guide: {d.name}")
    print(f"  {written} guide pages, guides index, search index ({len(GUIDES)} entries)")


if __name__ == "__main__":
    main()
