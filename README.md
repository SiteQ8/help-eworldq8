# help.eworldq8.com

A help site: guides you can follow yourself, a search over them in either
language, a two question triage, and a way to ask in your own words.
Everything in English and Arabic.

Live at **https://help.eworldq8.com** (HTTPS enforced). The Arabic side
opens from any link with `?lang=ar`, and the choice sticks on the next page.

## The design

One shape runs through the whole site: the three bars of the eWorld E. The
striped card the first screen opens with is that stripe; the search field is
a bar; every guide step is marked with a bar; the three lines of how we work
step across the page; the band above the footer is the three bars at full
width; and the mark itself sits large at the foot of every page.

The pictures are real pictures of this subject's world, found in Wikimedia
Commons under licences that allow commercial use, cropped to the site's
sizes in `assets/img/` with the originals and their licences beside them in
`assets/` and `assets/credits.json`. The credit line is built into the
footer of every page from that file. Every guide carries the picture of its
own subject (the keyboard for the spill, the inside of a router for Wi-Fi,
a phone taken apart for the phone guides, a rack of servers for a website
that is down), the same picture leads its row on the guides index, and
each guide ends with the three nearest guides to read next.

Motion is transform and opacity only: the parts of each section rise 20px
into place as they enter, pictures settle from a slight scale, controls
press down to 0.97, and hover is only wired where there is a pointer.
Reduced motion keeps the fades and drops the travel. The measurements that
hold this are run in a real browser (`tasteskill`'s inspector) at 1440,
768 and 390 wide on the home page, the guides index and a guide page, in
both languages: 0 failures.

## What is on it

**Fourteen guides** in six categories, each written to be followed alone in
the order the steps should actually happen, and each ending with when to stop
and ask. The wrong step at the wrong moment, recovery software onto a failing
drive or a hairdryer on a wet laptop, does more harm than the original
problem, so that section is not optional.

**Search** across titles, summaries and keywords in both languages at once.
Arabic diacritics and letter variants are normalised so a search in either
alphabet reaches the same guide.

**The two question triage**, 24 paths, each saying what the problem usually
is and what to try first, never what it definitely is.

**An ask form** that composes an email with what was typed. There is no
backend, so nothing leaves the page until the person presses send in their
own mail app, and the form says so.

## How it is built

`content/guides.py` holds the guides. `tools/build.py` generates one page per
guide, the guides index and `search.json`. The output is committed, so
GitHub Pages serves plain files and nothing runs at deploy time to make a
guide exist. A gate regenerates to a scratch copy and fails if a committed
page differs from what the content would produce now.

Every page shares one chrome: the eWorld logo, Guides, the language switch,
Get help. `assets/site.js` handles language on every page; `assets/app.js`
is the home page only.

## Things the tests caught

Three of these would have shipped without the suite, and one of them was
only found by looking at a screenshot.

- **`hidden` was being ignored.** The attribute is a low specificity UA rule,
  so `display: grid` on the step list and `display: inline-flex` on the button
  both beat it. The Arabic guide page showed both step lists and both buttons.
  The test had been checking the attribute rather than whether anything was
  visible, which is why it passed on a broken page. It measures boxes now.
- **`window.UI` was always undefined.** A top level `const` is not a window
  property. Every `data-t` string on every guide page silently failed to
  swap. Fixed by checking the identifier itself.
- **The test server returned 404 for every guide.** It did not serve a
  folder's `index.html` the way GitHub Pages does, so the guide pages were
  a 404 in the harness and fine in production. That is the wrong way round
  for a test server to be wrong.
- **eWorld blue is 4.27 against white.** That is the logo colour and it is
  below the 4.5 normal text needs, so it cannot be a button fill. Filled
  elements use `#0466a6` at 6.1, and the logo blue stays for the logo.

## What is deliberately missing

`CONTACT` in `assets/data.js` has phone, WhatsApp, hours and address set to
`null`. They do not render while null. No price appears anywhere and a gate
fails on a currency figure. No promises: a gate fails on "guaranteed",
"same day", "24/7" and similar.

## Gates and tests

```bash
python3 tools/build.py        # after editing content/guides.py
python3 tools/preflight.py    # 14 gates
node tools/test-interface.js  # 69 checks
```

The suite walks all 24 triage paths in both languages, opens all fourteen
guide pages in both languages and measures that only one language is
visible and the strings swapped, runs six searches across both alphabets,
checks the form composes an email and refuses an empty one, checks the
guides index shows every guide as a picture row and that a guide ends with
three other guides with four different pictures on the page, checks that
`?lang=ar` opens Arabic and sticks, and runs contrast, no-script, overflow
and tap target checks. Each gate and the visibility check are negative
tested.
