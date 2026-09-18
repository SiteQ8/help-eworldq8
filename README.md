# help.eworldq8.com

Everyday computing help. Websites built and checked, laptops and desktops
fixed, files recovered, things set up.

Served at **https://siteq8.github.io/help-eworldq8/** until DNS is in place.

## Before it can use its own address

`help.eworldq8.com` has no DNS record yet. Add this at whoever runs DNS for
`eworldq8.com`:

```
CNAME   help   siteq8.github.io.
```

Then tell me and I will add the `CNAME` file and bind it. Not before: binding
a custom domain that does not resolve makes GitHub redirect the working
github.io address to a dead one, and a gate fails the build if a `CNAME`
appears while the record is missing.

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

Eight gates, twenty eight checks. The tests click all twenty four triage
paths and assert each one produces an answer, carries the not-a-diagnosis
line and offers a way to get in touch. Eight contrast measurements, a
no-script pass, and a tap target check at 390 and 412px: the header button
came out at 43px, one short of the 44px a thumb needs.
