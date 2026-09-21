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
}


def shell(title_en, title_ar, body, depth, description_en):
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
<meta name="theme-color" content="#f6f8fb">
<link rel="icon" href="{up}assets/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap">
<link rel="stylesheet" href="{up}assets/styles.css">
</head>
<body>
<a class="skip" href="#main">Skip to content</a>

<header class="top">
  <div class="shell top-in">
    <a class="brand" href="{up}./" aria-label="eWorld Help">
      <img src="{up}assets/img/logo.png" srcset="{up}assets/img/logo@2x.png 2x" alt="eWorld" width="520" height="101">
      <span class="brand-help" data-t="brandHelp">Help</span>
    </a>
    <nav class="top-nav" aria-label="Primary">
      <a class="top-link" href="{up}guides/" data-t="navGuides">Guides</a>
      <button class="lang" id="lang" type="button" lang="ar">العربية</button>
      <a class="cta" href="{up}./#ask" data-t="getHelp">Get help</a>
    </nav>
  </div>
</header>

<main id="main">
{body}
</main>

<footer class="foot">
  <div class="shell foot-in">
    <img src="{up}assets/img/logo-white.png" alt="eWorld" width="160" height="31" class="foot-logo">
    <p data-t="footPlace">Online anywhere. In person by arrangement.</p>
  </div>
</footer>

<script src="{up}assets/data.js"></script>
<script src="{up}assets/site.js"></script>
</body>
</html>
"""


def both(v, cls="", tag="p"):
    """Render a bilingual value as two blocks; site.js shows the right one."""
    c = f' class="{cls}"' if cls else ""
    return (f'<{tag}{c} data-lang="en">{esc(v["en"])}</{tag}>'
            f'<{tag}{c} data-lang="ar" hidden>{esc(v["ar"])}</{tag}>')


def guide_page(g):
    cat = CAT[g["category"]]
    flag = ""
    if g["urgency"] != "low":
        flag = (f'<span class="flag flag-{g["urgency"]}" data-lang="en">{esc(UI[g["urgency"]]["en"])}</span>'
                f'<span class="flag flag-{g["urgency"]}" data-lang="ar" hidden>{esc(UI[g["urgency"]]["ar"])}</span>')
    steps_en = "".join(f"<li>{esc(s['en'])}</li>" for s in g["steps"])
    steps_ar = "".join(f"<li>{esc(s['ar'])}</li>" for s in g["steps"])
    subject_en = "Help with: " + g["title"]["en"]
    body = f"""
  <article class="guide shell">
    <p class="crumbs">
      <a href="../" data-lang="en">{esc(UI["backToGuides"]["en"])}</a>
      <a href="../" data-lang="ar" hidden>{esc(UI["backToGuides"]["ar"])}</a>
      <span aria-hidden="true">/</span>
      <span data-lang="en">{esc(cat["name"]["en"])}</span>
      <span data-lang="ar" hidden>{esc(cat["name"]["ar"])}</span>
    </p>
    <div class="guide-head">
      {both(g["title"], tag="h1")}
      {flag}
    </div>
    {both(g["summary"], "guide-lede")}

    <h2 data-lang="en">{esc(UI["stepsHeading"]["en"])}</h2>
    <h2 data-lang="ar" hidden>{esc(UI["stepsHeading"]["ar"])}</h2>
    <ol class="guide-steps" data-lang="en">{steps_en}</ol>
    <ol class="guide-steps" data-lang="ar" hidden>{steps_ar}</ol>

    <aside class="guide-stop">
      <h2 data-lang="en">{esc(UI["stopHeading"]["en"])}</h2>
      <h2 data-lang="ar" hidden>{esc(UI["stopHeading"]["ar"])}</h2>
      {both(g["stop"])}
      <a class="btn" href="mailto:mail@eworldq8.com?subject={esc(subject_en)}" data-lang="en">{esc(UI["askAbout"]["en"])}</a>
      <a class="btn" href="mailto:mail@eworldq8.com?subject={esc(subject_en)}" data-lang="ar" hidden>{esc(UI["askAbout"]["ar"])}</a>
    </aside>

    {both(UI["notDiagnosis"], "guide-fine")}
  </article>
"""
    return shell(g["title"]["en"], g["title"]["ar"], body, 2, g["summary"]["en"])


def guides_index():
    groups = []
    for c in CATEGORIES:
        items = [g for g in GUIDES if g["category"] == c["key"]]
        if not items:
            continue
        cards = "".join(f"""
        <li class="gcard">
          <a href="{g['slug']}/">
            {both(g['title'], 'gcard-title', 'span')}
            {both(g['summary'], 'gcard-sum', 'span')}
          </a>
        </li>""" for g in items)
        groups.append(f"""
    <section class="ggroup" id="{c['key']}">
      {both(c['name'], 'ggroup-h', 'h2')}
      <ul class="gcards">{cards}
      </ul>
    </section>""")
    body = f"""
  <section class="shell guides-top">
    {both(UI["guidesTitle"], tag="h1")}
    {both(UI["guidesLede"], "lede")}
  </section>
  <div class="shell">{''.join(groups)}
  </div>
"""
    return shell("Guides", "الأدلّة", body, 1, UI["guidesLede"]["en"])


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
