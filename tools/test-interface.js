/* help.eworldq8.com interface tests. Requires playwright.
   Run:  node tools/test-interface.js                                      */
const { chromium } = require('playwright');
const path = require('path');
const http = require('http');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const TYPES = { '.html':'text/html', '.css':'text/css', '.js':'text/javascript', '.svg':'image/svg+xml', '.json':'application/json', '.png':'image/png', '.jpg':'image/jpeg' };
const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
  let file = path.join(ROOT, rel);
  /* a folder serves its index.html, as GitHub Pages does; without this every
     guide URL was a 404 in the harness and a pass in production */
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!file.startsWith(ROOT) || !fs.existsSync(file)) {
    res.writeHead(404); res.end('not found'); return;
  }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
let url;

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  url = 'http://127.0.0.1:' + server.address().port + '/';
  const b = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const errs = [], R = [];
  const T = (n, ok, d = '') => R.push(`${ok ? 'pass' : 'FAIL'}  ${n}${d ? ' :: ' + d : ''}`);

  const p = await b.newPage({ viewport: { width: 1180, height: 900 } });
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('response', r => { if (r.status() >= 400) errs.push(`HTTP ${r.status()} ${r.url()}`); });
  await p.goto(url, { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);

  /* ---------- the page ---------- */
  await p.waitForFunction(() => document.querySelectorAll('.sheets .sheet').length === 6, { timeout: 5000 });
  T('services render as six sheets', await p.evaluate(() => document.querySelectorAll('.sheets .sheet').length === 6));
  T('no undefined anywhere', await p.evaluate(() => !document.body.innerText.includes('undefined')));
  /* the triage sits inside the hero now, so the first thing to tap is the
     first device option, and it has to be on screen without scrolling */
  T('the search box is above the fold', await p.evaluate(() => {
    const b = document.getElementById('q').getBoundingClientRect();
    return b.top < innerHeight && b.height > 40;
  }));
  T('the real logo is in the header', await p.evaluate(() => {
    const i = document.querySelector('.brand img');
    return !!i && i.naturalWidth > 0 && /logo/.test(i.getAttribute('src'));
  }));
  T('the step counter reads step 1 of 2', await p.evaluate(() =>
    /1 .* 2/.test(document.getElementById('ask-step').textContent)));
  T('every service says remote or hands on', await p.evaluate(() =>
    [...document.querySelectorAll('.sheets .sheet')].every(s => /remote|hands on|عن بُعد|حضوري/i.test(s.textContent))));
  /* the sheet pictures are lazy loaded below the fold, so they are scrolled
     into view and awaited; naturalWidth before that is 0 on a good image */
  T('every service sheet carries a real picture and names its guides', await p.evaluate(async () => {
    const imgs = [...document.querySelectorAll('.sheet-pic img')];
    for (const i of imgs) i.scrollIntoView();
    await Promise.all(imgs.map(i => i.complete ? null : new Promise(r => { i.onload = r; i.onerror = r; setTimeout(r, 4000); })));
    const links = [...document.querySelectorAll('.sheet-guides a')].map(a => a.getAttribute('href'));
    window.scrollTo(0, 0);
    return imgs.filter(i => i.naturalWidth > 0).length === 6 && links.length >= 10 && links.every(h => /^guides\/[a-z-]+\/$/.test(h));
  }));
  T('nothing on the page assumes a place', await p.evaluate(() =>
    !/kuwait|الكويت|bring it in|أحضره/i.test(document.body.innerText)));

  /* ---------- every triage path, in both languages ----------
     48 walks. A dead end sends a customer away with nothing, and a path that
     works in English but falls back to English inside Arabic is a half
     translated page, which is worse than an English one. */
  for (const lang of ['en', 'ar']) {
    await p.evaluate((l) => {
      if (document.documentElement.lang !== l) document.getElementById('lang').click();
    }, lang);
    await p.waitForTimeout(120);
    T(`${lang}: the document direction is right`, await p.evaluate((l) =>
      document.documentElement.dir === (l === 'ar' ? 'rtl' : 'ltr'), lang));

    const devices = await p.evaluate(() => TRIAGE.devices.map(d => d.key));
    let paths = 0; const empty = [], noFine = [], fellBack = [];
    for (const dev of devices) {
      const syms = await p.evaluate(d => TRIAGE.symptoms[d].map(s => s.key), dev);
      for (const sym of syms) {
        const r = await p.evaluate(([d, s, l]) => {
          document.querySelectorAll('#devices .opt')[TRIAGE.devices.findIndex(x => x.key === d)].click();
          document.querySelectorAll('#symptoms .opt')[TRIAGE.symptoms[d].findIndex(x => x.key === s)].click();
          const out = document.getElementById('result');
          const txt = out.innerText;
          const want = l === 'ar' ? TRIAGE.answers[d + ':' + s].likely.ar
                                  : TRIAGE.answers[d + ':' + s].likely.en;
          return { hidden: out.hidden, len: txt.trim().length,
                   right: txt.includes(want),
                   fine: new RegExp(l === 'ar' ? 'وليس تشخيصاً' : 'not a diagnosis').test(txt),
                   cta: !!out.querySelector('a.btn') };
        }, [dev, sym, lang]);
        paths++;
        if (r.hidden || r.len < 40 || !r.cta) empty.push(`${dev}:${sym}`);
        if (!r.right) fellBack.push(`${dev}:${sym}`);
        if (!r.fine) noFine.push(`${dev}:${sym}`);
        await p.evaluate(() => document.getElementById('back').click());
      }
    }
    T(`${lang}: every triage path gives an answer`, empty.length === 0, `${paths} paths, ${empty.length} empty`);
    T(`${lang}: no path falls back to the other language`, fellBack.length === 0,
      fellBack.slice(0, 4).join(', ') || 'all in language');
    T(`${lang}: every answer says it is not a diagnosis`, noFine.length === 0,
      noFine.slice(0, 4).join(', ') || 'all do');
  }

  /* the urgent cases have to read as urgent, in both */
  for (const lang of ['en', 'ar']) {
    const spill = await p.evaluate((l) => {
      if (document.documentElement.lang !== l) document.getElementById('lang').click();
      document.querySelectorAll('#devices .opt')[0].click();
      const i = TRIAGE.symptoms.laptop.findIndex(s => s.key === 'liquid');
      document.querySelectorAll('#symptoms .opt')[i].click();
      const out = document.getElementById('result');
      return { flag: (out.querySelector('.r-flag') || {}).textContent || '', text: out.innerText };
    }, lang);
    T(`${lang}: a liquid spill is flagged and says turn it off`,
      spill.flag.length > 0 && new RegExp(lang === 'ar' ? 'أطفئه الآن' : 'Turn it off now').test(spill.text));
    T(`${lang}: a liquid spill warns against rice`,
      new RegExp(lang === 'ar' ? 'الأرزّ' : 'rice').test(spill.text));
    await p.evaluate(() => document.getElementById('back').click());
  }

  /* the choice has to survive a reload, or nobody will use it twice */
  await p.evaluate(() => { if (document.documentElement.lang !== 'ar') document.getElementById('lang').click(); });
  await p.reload({ waitUntil: 'networkidle' });
  T('the language choice survives a reload', await p.evaluate(() =>
    document.documentElement.lang === 'ar' && document.documentElement.dir === 'rtl'));
  await p.evaluate(() => document.getElementById('lang').click());

  /* ---------- search, in both languages ----------
     Typing the problem is how most people arrive at a help site. Both
     languages have to reach the same guide, and nonsense has to say so
     rather than show nothing. */
  await p.waitForFunction(() => document.querySelectorAll('#topics .topic').length === 6, { timeout: 5000 });
  const searches = [
    ['en', 'laptop will not turn on', 'laptop-will-not-turn-on'],
    ['en', 'deleted files', 'recover-deleted-files'],
    ['en', 'wifi dropping', 'wifi-keeps-dropping'],
    ['ar', 'لابتوب لا يعمل', 'laptop-will-not-turn-on'],
    ['ar', 'ملفات محذوفة', 'recover-deleted-files'],
    ['ar', 'احتيال', 'spotting-a-scam-message'],
  ];
  for (const [lang, q, slug] of searches) {
    await p.evaluate((l) => { if (document.documentElement.lang !== l) document.getElementById('lang').click(); }, lang);
    await p.fill('#q', q);
    await p.waitForTimeout(150);
    const top = await p.evaluate(() => {
      const a = document.querySelector('#hits .hit a');
      return a ? a.getAttribute('href') : null;
    });
    T(`${lang}: "${q}" finds the right guide first`, top === `guides/${slug}/`, top || 'no hits');
  }
  await p.fill('#q', 'xqzvv plorb');
  await p.waitForTimeout(150);
  T('nonsense says nothing matched rather than showing nothing', await p.evaluate(() =>
    !!document.querySelector('#hits .hit-none') && !document.getElementById('hits').hidden));
  await p.fill('#q', '');
  await p.evaluate(() => { if (document.documentElement.lang !== 'en') document.getElementById('lang').click(); });

  T('every guide in the topic frames links to a page that exists', await p.evaluate(async () => {
    const hrefs = [...document.querySelectorAll('#topic-frame .frame-list a')].map(a => a.getAttribute('href'));
    const checks = await Promise.all(hrefs.map(h => fetch(h).then(r => r.ok)));
    return hrefs.length === 14 && new Set(hrefs).size === 14 && checks.every(Boolean);
  }));
  /* the poster list: six topics, their counts add up to the fourteen guides,
     and pointing at a line brings its frame up */
  T('the six topics count fourteen guides between them', await p.evaluate(() => {
    const ns = [...document.querySelectorAll('#topics .topic-n')].map(n => parseInt(n.textContent, 10));
    return ns.length === 6 && ns.reduce((a, b) => a + b, 0) === 14 && ns.every(n => n >= 1);
  }));
  T('pointing at a topic brings up its picture and its guides', await p.evaluate(async () => {
    const rows = [...document.querySelectorAll('#topics .topic a')];
    rows[2].dispatchEvent(new PointerEvent('pointerenter', { bubbles: false }));
    await new Promise(r => setTimeout(r, 300));
    const on = document.querySelector('#topic-frame .frame-panel.on');
    const idx = [...document.querySelectorAll('#topic-frame .frame-panel')].indexOf(on);
    const active = document.querySelectorAll('#topics .topic.active').length;
    const img = on && on.querySelector('img');
    return idx === 2 && active === 1 && document.querySelector('#topics .topic:nth-child(3)').classList.contains('active') && img && on.querySelectorAll('.frame-list a').length === 3;
  }));
  /* the chapters: one field each, and the header takes the field beneath it */
  T('the header takes the colour of the chapter beneath it', await p.evaluate(async () => {
    const top = document.getElementById('top');
    const before = top.dataset.field;
    window.scrollTo(0, document.getElementById('ask').getBoundingClientRect().top + scrollY + 200);
    await new Promise(r => requestAnimationFrame(() => setTimeout(r, 80)));
    const mid = top.dataset.field;
    window.scrollTo(0, 0);
    await new Promise(r => requestAnimationFrame(() => setTimeout(r, 80)));
    return before === 'blue' && mid === 'navy' && top.dataset.field === 'blue';
  }));
  T('the first screen is the statement in two inks over the search', await p.evaluate(() => {
    const s1 = getComputedStyle(document.querySelector('.statement .s1')).color, s2 = getComputedStyle(document.querySelector('.statement .s2')).color;
    const h = document.querySelector('.statement').getBoundingClientRect();
    return s1 !== s2 && h.top < innerHeight * 0.4 && h.height > innerHeight * 0.25 && document.querySelectorAll('.stage').length === 3 && document.querySelectorAll('.mark a').length === 3;
  }));

  /* ---------- the ask form composes an email, nothing more ---------- */
  const formGo = await p.evaluate(() => {
    const f = document.getElementById('askform');
    f.name.value = 'Test'; f.what.value = 'The screen stays black when I press power.';
    return window.__composeAsk(f);
  });
  T('the form refuses an empty description', await p.evaluate(() => {
    const f = document.getElementById('askform'); f.what.value = '';
    f.dispatchEvent(new Event('submit', { cancelable: true }));
    return !document.getElementById('form-err').hidden;
  }));

  /* ---------- contact ---------- */
  const contact = await p.evaluate(() => ({
    items: [...document.querySelectorAll('.contact-item')].map(a => a.getAttribute('href')),
    note: document.getElementById('contact-note').textContent,
    set: Object.entries(CONTACT).filter(([, v]) => v).map(([k]) => k),
  }));
  T('only the contact details that exist are shown',
    contact.items.length === contact.set.length, `${contact.items.length} shown, ${contact.set.length} set`);
  T('no invented phone number is rendered',
    !contact.items.some(h => h.startsWith('tel:')),
    contact.items.join(', '));
  T('the note matches how many ways there are to make contact',
    contact.items.length > 1 ? !/on its way/.test(contact.note) : /on its way/.test(contact.note));

  /* ---------- contrast ---------- */
  const contrast = await p.evaluate(() => {
    const srgb = v => { v /= 255; return v <= 0.04045 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); };
    const chan = c => { const m = (c||'').match(/[\d.]+/g); if (!m) return null; const v = m.map(Number);
      return /^color\(/.test(c) ? [v[0]*255, v[1]*255, v[2]*255, v[3] ?? 1] : v; };
    const lum = c => { const m = chan(c); return 0.2126*srgb(m[0])+0.7152*srgb(m[1])+0.0722*srgb(m[2]); };
    const ratio = (a, c) => { const [x, y] = [lum(a), lum(c)].sort((m,n)=>n-m); return (x+0.05)/(y+0.05); };
    const bgOf = e => { let n = e; while (n) { const v = chan(getComputedStyle(n).backgroundColor);
      if (v && (v.length < 4 || v[3] > 0)) return `rgb(${v[0]},${v[1]},${v[2]})`; n = n.parentElement; }
      return 'rgb(253,252,250)'; };
    const check = (sel, label) => {
      const e = document.querySelector(sel); if (!e) return { label, skipped: true };
      const st = getComputedStyle(e), size = parseFloat(st.fontSize);
      const large = size >= 24 || (parseInt(st.fontWeight, 10) >= 700 && size >= 18.66);
      const need = large ? 3.0 : 4.5, r = ratio(st.color, bgOf(e));
      return { label, ratio: +r.toFixed(2), need, pass: r >= need, px: +size.toFixed(1) };
    };
    return [check('.topics-lede', 'topics lede'), check('.ask-lede', 'ask lede'), check('.stop-head p', 'stop paragraph'),
            check('.sheet:nth-child(1) .sheet-p', 'sheet text on blue'), check('.sheet:nth-child(2) .sheet-p', 'sheet text on white'), check('.sheet:nth-child(3) .sheet-p', 'sheet text on navy'),
            check('.sheet:nth-child(5) .sheet-p', 'sheet text on ink'), check('.sheet-guides a', 'sheet guide link'), check('.opt', 'option button'), check('.topic-n', 'topic count'),
            check('.stage figcaption p', 'stage text'), check('.foot-note', 'footer'), check('.foot-credit', 'credits'),
            check('.cta', 'header button'), check('.top-link', 'header link'), check('.hero-sent', 'hero sentence'), check('.search-label', 'search label'), check('.hero .fine', 'search fine print'),
            check('.askform label', 'form label'), check('.stop-note', 'contact note'), check('.contact-mail b', 'email display'), check('.lang', 'language button')];
  });
  contrast.forEach(c => c.skipped ? T(`contrast ${c.label}`, false, 'not found')
    : T(`contrast ${c.label}`, c.pass, `${c.ratio} vs ${c.need} at ${c.px}px`));
  await p.close();

  /* ---------- no scripting ---------- */
  const njc = await b.newContext({ viewport: { width: 1180, height: 900 }, javaScriptEnabled: false });
  const nj = await njc.newPage();
  await nj.goto(url, { waitUntil: 'domcontentloaded' });
  T('the headline is readable without scripting', await nj.locator('h1').isVisible());
  T('the way to get in touch survives without scripting',
    (await nj.locator('a[href^="mailto:"], a[href^="#ask"]').count()) > 0);
  await njc.close();

  /* ---------- every guide page, both languages ---------- */
  const slugs = JSON.parse(fs.readFileSync(path.join(ROOT, 'search.json'), 'utf8')).map(e => e.slug);
  let bad = [];
  for (const slug of slugs) {
    const gp = await b.newPage({ viewport: { width: 1180, height: 900 } });
    gp.on('pageerror', e => errs.push(`${slug}: ${e.message}`));
    gp.on('response', r => { if (r.status() >= 400) errs.push(`HTTP ${r.status()} ${r.url()}`); });
    await gp.goto(url + 'guides/' + slug + '/', { waitUntil: 'networkidle' });
    /* visibility is measured by box, not by the hidden attribute: the
       attribute was set and the elements were still on screen */
    const en = await gp.evaluate(() => {
      const vis = s => [...document.querySelectorAll(s)].filter(e => e.getBoundingClientRect().height > 0).length;
      return {
        title: document.querySelector('h1 [data-lang="en"]')?.textContent.trim().length || 0,
        steps: document.querySelectorAll('.guide-steps[data-lang="en"] li').length,
        arVisible: vis('[data-lang="ar"]'), ctasVisible: vis('.guide-stop a.btn'),
        cta: document.querySelector('.guide-stop a.btn[data-lang="en"]')?.getAttribute('href') || '',
        logo: !!document.querySelector('.brand img'),
        foot: document.querySelector('.foot p[data-t]')?.textContent,
      };
    });
    await gp.evaluate(() => document.getElementById('lang').click());
    const ar = await gp.evaluate(() => {
      const vis = s => [...document.querySelectorAll(s)].filter(e => e.getBoundingClientRect().height > 0).length;
      return {
        dir: document.documentElement.dir,
        title: document.querySelector('h1 [data-lang="ar"]')?.textContent.trim().length || 0,
        enVisible: vis('[data-lang="en"]'), ctasVisible: vis('.guide-stop a.btn'),
        stepsVisible: vis('.guide-steps li'),
        steps: document.querySelectorAll('.guide-steps[data-lang="ar"] li').length,
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        foot: document.querySelector('.foot p[data-t]')?.textContent,
      };
    });
    if (!(en.title > 5 && en.steps >= 4 && en.arVisible === 0 && en.ctasVisible === 1
          && en.cta.startsWith('mailto:') && en.logo)) bad.push(slug + ' (en)');
    if (!(ar.enVisible === 0 && ar.ctasVisible === 1 && ar.stepsVisible === ar.steps)) bad.push(slug + ' (ar: both languages showing)');
    if (en.foot === ar.foot) bad.push(slug + ' (ar: strings did not swap)');
    if (slug === slugs[0]) {
      /* the keep reading strip: three other guides, four different pictures on the page */
      const more = await gp.evaluate(async () => {
        const tiles = [...document.querySelectorAll('.more .ptile')];
        for (const t of tiles) t.scrollIntoView();
        await Promise.all([...document.querySelectorAll('.more img')].map(i => i.complete ? null : new Promise(r => { i.onload = i.onerror = r; })));
        const hrefs = tiles.map(t => t.querySelector('a').getAttribute('href'));
        const pics = new Set([...document.querySelectorAll('main img')].filter(i => i.naturalWidth > 0).map(i => i.currentSrc.split('/').pop()));
        const arTitles = [...document.querySelectorAll('.more .ptile-t[data-lang="ar"]')].filter(e => e.getBoundingClientRect().height > 0).length;
        return { n: tiles.length, self: hrefs.filter(h => h === '../' + location.pathname.split('/').filter(Boolean).pop() + '/').length,
                 distinct: new Set(hrefs).size, pics: pics.size, arTitles };
      });
      T('a guide ends with three other guides to read, each with its own picture',
        more.n === 3 && more.distinct === 3 && more.self === 0 && more.pics >= 4 && more.arTitles === 3,
        `${more.n} tiles, ${more.distinct} distinct, ${more.pics} pictures, ${more.arTitles} arabic titles showing`);
      /* contrast on the guide page itself, measured once */
      const gc = await gp.evaluate(() => {
        const srgb = v => { v /= 255; return v <= 0.04045 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); };
        const lum = c => { const m = c.match(/[\d.]+/g).map(Number); return 0.2126*srgb(m[0])+0.7152*srgb(m[1])+0.0722*srgb(m[2]); };
        const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return +((x+0.05)/(y+0.05)).toFixed(2); };
        const bg = 'rgb(246,248,251)';
        const r = s => ratio(getComputedStyle(document.querySelector(s)).color, bg);
        return { step: r('.guide-steps[data-lang="en"] li'), lede: r('.guide-lede[data-lang="en"]'),
                 crumb: r('.crumbs a[data-lang="en"]'), fine: r('.guide-fine[data-lang="en"]') };
      });
      T('contrast on a guide page', Object.values(gc).every(v => v >= 4.5),
        Object.entries(gc).map(([k, v]) => `${k} ${v}`).join(', '));
    }
    if (!(ar.dir === 'rtl' && ar.title > 5 && ar.steps === en.steps && !ar.overflow)) bad.push(slug + ' (ar)');
    await gp.close();
  }
  T(`every guide page renders in both languages`, bad.length === 0, bad.join(', ') || `${slugs.length} guides, both languages`);
  /* the guides index: every guide as a picture row, grouped by topic, in both languages */
  {
    const gp = await b.newPage({ viewport: { width: 1180, height: 900 } });
    gp.on('pageerror', e => errs.push(`guides index: ${e.message}`));
    await gp.goto(url + 'guides/', { waitUntil: 'networkidle' });
    const idx = await gp.evaluate(async () => {
      const tiles = [...document.querySelectorAll('.gindex .ptile')];
      for (const t of tiles) t.scrollIntoView();
      await Promise.all([...document.querySelectorAll('.gindex img')].map(i => i.complete ? null : new Promise(r => { i.onload = i.onerror = r; })));
      const loaded = [...document.querySelectorAll('.gindex img')].filter(i => i.naturalWidth > 0).length;
      const hrefs = tiles.map(t => t.querySelector('a').getAttribute('href'));
      const pics = new Set([...document.querySelectorAll('.gindex img')].map(i => i.getAttribute('src'))).size;
      return { tiles: tiles.length, loaded, groups: document.querySelectorAll('.gset').length, distinct: new Set(hrefs).size, pics,
               overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth };
    });
    T('the guides index shows every guide as a picture row', idx.tiles === 14 && idx.loaded === 14 && idx.distinct === 14 && idx.groups === 6 && idx.pics >= 6 && !idx.overflow,
      `${idx.tiles} rows, ${idx.loaded} pictures loaded, ${idx.pics} different pictures, ${idx.groups} topics`);
    await gp.evaluate(() => document.getElementById('lang').click());
    const ar = await gp.evaluate(() => ({
      dir: document.documentElement.dir,
      en: [...document.querySelectorAll('.gindex [data-lang="en"]')].filter(e => e.getBoundingClientRect().height > 0).length,
      ar: [...document.querySelectorAll('.gindex .ptile-t[data-lang="ar"]')].filter(e => e.getBoundingClientRect().height > 0).length,
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    }));
    T('the guides index reads in Arabic without overflow', ar.dir === 'rtl' && ar.en === 0 && ar.ar === 14 && !ar.overflow, `${ar.ar} arabic rows, ${ar.en} english showing`);
    await gp.evaluate(() => document.getElementById('lang').click());
    await gp.close();
  }
  /* a link can carry the language */
  {
    const gp = await b.newPage({ viewport: { width: 1180, height: 900 } });
    await gp.goto(url + '?lang=ar', { waitUntil: 'networkidle' });
    const a = await gp.evaluate(() => ({ lang: document.documentElement.lang, dir: document.documentElement.dir, h1: document.querySelector('h1').textContent }));
    await gp.goto(url + 'guides/', { waitUntil: 'networkidle' });
    const kept = await gp.evaluate(() => document.documentElement.lang);
    T('?lang=ar opens the Arabic page and the choice sticks', a.lang === 'ar' && a.dir === 'rtl' && /[\u0600-\u06FF]/.test(a.h1) && kept === 'ar', `${a.h1}, next page ${kept}`);
    await gp.evaluate(() => { try { localStorage.removeItem('help-lang'); } catch (e) {} });
    await gp.close();
  }
  // a fresh page has to come up in the remembered language
  {
    const gp = await b.newPage({ viewport: { width: 1180, height: 900 } });
    await gp.goto(url + 'guides/', { waitUntil: 'networkidle' });
    await gp.evaluate(() => { if (document.documentElement.lang !== 'ar') document.getElementById('lang').click(); });
    await gp.goto(url + 'guides/' + slugs[0] + '/', { waitUntil: 'networkidle' });
    T('the language choice carries between pages', await gp.evaluate(() =>
      document.documentElement.lang === 'ar' && document.documentElement.dir === 'rtl'));
    await gp.evaluate(() => document.getElementById('lang').click());
    await gp.close();
  }

  /* ---------- phone ---------- */
  for (const [w, h, lang] of [[390, 844, 'en'], [412, 915, 'en'], [390, 844, 'ar'], [412, 915, 'ar']]) {
    const mp = await b.newPage({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true });
    mp.on('pageerror', e => errs.push(`${w}px ${lang}: ${e.message}`));
    await mp.goto(url, { waitUntil: 'networkidle' });
    await mp.evaluate((l) => { if (document.documentElement.lang !== l) document.getElementById('lang').click(); }, lang);
    await mp.evaluate(() => document.fonts.ready);
    const m = await mp.evaluate(() => ({
      hscroll: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      overflow: [...document.querySelectorAll('body *')]
        .filter(e => e.getBoundingClientRect().right > document.documentElement.clientWidth + 1).length,
      smallTargets: [...document.querySelectorAll('a.cta, a.btn, .opt, .contact-item')]
        .filter(e => e.getBoundingClientRect().height < 44).length,
    }));
    T(`${w}px ${lang}: no horizontal scroll`, !m.hscroll);
    T(`${w}px ${lang}: nothing overflows`, m.overflow === 0, `${m.overflow} elements`);
    T(`${w}px ${lang}: every tap target is at least 44px`, m.smallTargets === 0, `${m.smallTargets} too small`);
    await mp.close();
  }

  console.log(R.join('\n'));
  const fails = R.filter(r => r.startsWith('FAIL')).length;
  console.log(`\n${R.length - fails}/${R.length} passed`);
  console.log(errs.length ? 'ERRORS: ' + errs.join('; ') : 'no page errors, no 404s');
  await b.close();
  server.close();
  process.exit(fails ? 1 : 0);
})();
