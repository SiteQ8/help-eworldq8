# help.eworldq8.com

Everyday computing help, wherever you are. Websites built and checked,
laptops and desktops fixed, files recovered, things set up. Remote first;
hardware that needs hands on it is arranged in person or by courier.

Nothing on the page assumes a country or a shop down the road, and a test
fails if "Kuwait" or "bring it in" reappears.

Served at **https://siteq8.github.io/help-eworldq8/** until DNS is in place.

## Before it can use its own address

The DNS record exists but points at `ssiteq8.github.io.` with a double s.
It has to be:

```
CNAME   help   siteq8.github.io.
```

Every `*.github.io` resolves to the same Pages IPs, so the typo still
resolves, but GitHub cannot tell whose site to serve and answers 404 over
http and 503 over https. Fix the one character and the `CNAME` file gets
added and bound. Not before: binding
a custom domain that does not resolve makes GitHub redirect the working
github.io address to a dead one, and a gate fails the build if a `CNAME`
appears while the record is missing.

## The design

Warm paper, one electric blue, one signal lime. Sora for anything read from
across the room, Inter up close, IBM Plex Sans Arabic for Arabic.

The triage lives inside the hero. It is the most useful thing on the page,
and someone with a broken machine should not have to scroll to find it. The
services are a bento grid: two dark cards anchor it and four light ones fill
around them, each tagged remote or hands on so a visitor can see at a glance
what needs a courier and what does not.

Every `data-t` element carries its English text in the markup. The script
only ever swaps language, so the page reads without scripting. An earlier
build left those elements empty for the script to fill, and the no-script
check caught the headline rendering blank.

## Arabic

Every visible string carries both languages, so the switch is a re-render
rather than a second page to keep in step. Arabic sets `dir` on the document
and the layout follows, because the stylesheet uses logical properties
throughout. The choice is remembered.

The Arabic is written as Arabic rather than translated word for word:
clauses joined with connectors instead of chopped into short sentences, and
Western digits, which is what Kuwait uses in practice.

Three gates hold it: every English string must have a non empty Arabic one
beside it and every `data-t` key in the markup must exist, no Arabic-Indic
digits, and the direction must actually switch with no physical side
properties left in the stylesheet for RTL to trip over.

The skip link used to be hidden at `inset-inline-start: -9999px`. That works
in English and throws it off the far right edge in Arabic, where the
property maps to the other side. It is hidden by clipping now.

## The triage

Two questions, four devices, twenty four paths. It says what the problem
usually turns out to be, what is worth trying first, and whether it needs to
come in.

It says "usually" everywhere, and every result carries a line saying it is
not a diagnosis. A page cannot see the machine, and telling somebody their
drive has failed when it has not sends them to buy a drive they do not need.
Two gates hold that: one fails if any path has no answer, the other fails if
the copy starts stating certainties.

The liquid spill path is the one that matters most. It says turn it off now,
do not plug it back in, and specifically warns against rice and hairdryers,
because those two pieces of folk advice do real damage.

## What is deliberately missing

`CONTACT` in `assets/data.js` has `phone`, `whatsapp`, `hours` and `address`
set to `null`. They do not render while they are null, and the contact note
changes wording to match. Nothing was invented:

- No price appears anywhere. A gate fails the build if a currency figure
  turns up, because no price list was agreed.
- No phone number, because none was given.
- No promises. A gate fails on "guaranteed", "same day", "24/7", "no fix no
  fee" and similar. Those are business commitments, not copy.

## Gates and tests

```bash
python3 tools/preflight.py
node tools/test-interface.js
```

Eleven gates, forty seven checks. The tests walk all twenty four triage paths
in **both** languages, forty eight walks, and assert each produces an answer,
carries the not-a-diagnosis line, offers a way to get in touch, and does not
fall back to the other language. Nine contrast measurements, a no-script
pass, a reload to confirm the language choice persists, and overflow and tap
target checks at 390 and 412px in both directions.

Two things those checks caught: the header button at 43px, one short of the
44px a thumb needs, and the skip link overflowing in RTL.
