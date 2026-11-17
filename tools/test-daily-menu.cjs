// Daily menu behavior is checked with a fixed clock, independent of the visitor's timezone.
process.env.TZ = 'Pacific/Honolulu';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
const qaRequire = createRequire(path.join(root, '.cms-qa/package.json'));
const { JSDOM } = qaRequire('jsdom');
const YAML = qaRequire('yaml');
const source = fs.readFileSync(path.join(root, 'content.js'), 'utf8');
const schema = YAML.parse(fs.readFileSync(path.join(root, '.pages.yml'), 'utf8'));
const initial = Object.fromEntries(schema.content.map(entry => [path.basename(entry.path, '.json'), JSON.parse(fs.readFileSync(path.join(root, entry.path), 'utf8'))]));
const opened = [];
const clone = value => JSON.parse(JSON.stringify(value));
const standardMenu = {
  date: '2026-11-16',
  starter: 'Salade du jardin',
  main: 'Poulet rôti, pommes de terre et légumes',
  dessert: 'Tarte aux pommes',
  price: '22.50 CHF',
  // Older saved menus may still contain a photo; the approved layout ignores it.
  photo: '/image/logo.jpeg'
};

async function page(filename, menus, options = {}) {
  const dom = new JSDOM(fs.readFileSync(path.join(root, filename), 'utf8'), {
    url: 'https://restaurant-buvette-otennis.ch/' + filename,
    runScripts: 'outside-only'
  });
  opened.push(dom);
  const { window } = dom;
  const NativeDate = window.Date;
  let clock = NativeDate.parse(options.now || '2026-11-16T11:00:00Z');
  window.Date = class extends NativeDate {
    constructor(...args) { super(...(args.length ? args : [clock])); }
    static now() { return clock; }
  };
  window.HTMLElement.prototype.scrollIntoView = function () {};
  const intervals = [];
  window.setInterval = (callback, delay) => {
    intervals.push({ callback, delay });
    return intervals.length;
  };
  const calls = [];
  const data = clone(initial);
  data['daily-menu'] = { menus };
  data.home.heroTitle = 'Accueil toujours disponible';
  data.restaurant.phone = '032 481 00 00';
  window.fetch = async (url, requestOptions) => {
    const name = path.basename(new URL(url).pathname, '.json');
    calls.push({ name, options: requestOptions });
    if ((options.failed || []).includes(name)) throw new Error('Simulated content outage');
    return { ok: true, json: async () => clone(data[name]) };
  };
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Content loading timed out')), 5000);
    window.document.addEventListener('otennis:content-ready', () => {
      clearTimeout(timer);
      resolve();
    }, { once: true });
    window.eval(source);
  });
  return {
    dom, window, document: window.document, calls, data, intervals,
    advance(instant) { clock = NativeDate.parse(instant); },
    async tick() {
      for (const interval of intervals) interval.callback();
      await new Promise(resolve => setImmediate(resolve));
    }
  };
}

function displayed(test) {
  const block = test.document.querySelector('#menu-du-jour');
  return block && !block.hidden ? block : null;
}

(async () => {
  assert.equal(new Date('2026-11-15T23:05:00Z').getDate(), 15, 'Run the visitor clock outside the Zurich timezone');
  const entry = schema.content.find(item => item.name === 'daily-menu');
  assert.ok(entry, 'The manager needs a dedicated Menu du jour form');
  assert.equal(entry.path, 'data/daily-menu.json');
  const menuFields = entry.fields.find(field => field.name === 'menus');
  assert.ok(menuFields && menuFields.type === 'object' && menuFields.list);
  for (const key of ['date', 'main', 'price']) {
    assert.ok(menuFields.fields.find(field => field.name === key && field.required), key + ' must be required in the manager form');
  }
  assert.ok(!menuFields.fields.some(field => field.name === 'photo'), 'The text-only daily menu form must not ask for a photo');
  assert.ok(Array.isArray(initial['daily-menu'].menus), 'Daily menus must be stored as an editable list');

  for (const filename of ['index.html', 'menu.html']) {
    const test = await page(filename, [standardMenu]);
    const block = displayed(test);
    assert.ok(block, 'Today’s menu must appear on ' + filename);
    for (const key of ['starter', 'main', 'dessert', 'price']) assert.ok(block.textContent.includes(standardMenu[key]), key + ' must be visible');
    assert.equal(block.querySelector('time').dateTime, standardMenu.date);
    assert.match(block.textContent, /16 novembre 2026/);
    assert.equal(block.querySelector('img'), null, 'Daily menus must stay text-only even when older saved data contains a photo');
    assert.ok(test.calls.some(call => call.name === 'daily-menu'));
    assert.ok(test.calls.every(call => call.options.cache === 'no-cache' && call.options.credentials === 'omit'));
  }

  for (const menus of [
    [],
    [{ ...standardMenu, date: '2026-11-15' }],
    [{ ...standardMenu, date: '2026-11-17' }],
    [{ ...standardMenu, date: '2026-02-30' }],
    [{ ...standardMenu, date: '16/11/2026' }],
    [{ ...standardMenu, main: '   ' }],
    [{ ...standardMenu, price: '   ' }],
    [null, 12, {}]
  ]) {
    const test = await page('index.html', menus);
    assert.equal(displayed(test), null, 'No blank, stale, future or invalid menu may be shown');
    assert.equal(test.document.querySelector('.hero h2').textContent, test.data.home.heroTitle);
  }

  const concise = await page('index.html', [{ date: standardMenu.date, main: standardMenu.main, price: standardMenu.price }]);
  assert.ok(displayed(concise));
  assert.equal(displayed(concise).querySelector('img'), null);
  assert.doesNotMatch(displayed(concise).textContent, /undefined|null/);
  assert.ok(!displayed(concise).textContent.includes('Entrée'));
  assert.ok(!displayed(concise).textContent.includes('Dessert'));

  const duplicates = await page('index.html', [
    { ...standardMenu, main: '' },
    standardMenu,
    { ...standardMenu, main: 'Doublon à ignorer' }
  ]);
  assert.ok(displayed(duplicates).textContent.includes(standardMenu.main));
  assert.ok(!displayed(duplicates).textContent.includes('Doublon à ignorer'));

  const attack = '<img src=x onerror=alert(1)>';
  const hostile = await page('index.html', [{ ...standardMenu, starter: attack, main: attack, dessert: attack, price: attack, photo: 'javascript:alert(1)' }]);
  assert.ok(displayed(hostile).textContent.includes(attack));
  assert.equal(displayed(hostile).querySelector('img'), null);
  assert.equal(hostile.document.querySelectorAll('[onerror], img[src^="javascript:"], a[href^="javascript:"]').length, 0);

  // At these instants UTC is still the previous day; Zurich has passed midnight.
  for (const [now, date] of [
    ['2026-11-15T23:05:00Z', '2026-11-16'],
    ['2026-07-15T22:05:00Z', '2026-07-16']
  ]) {
    const test = await page('index.html', [{ ...standardMenu, date }], { now });
    assert.ok(displayed(test), 'The date must use Zurich time in winter and summer');
    assert.equal(displayed(test).querySelector('time').dateTime, date);
  }
  const beforeMidnight = await page('index.html', [{ ...standardMenu, date: '2026-11-16' }], { now: '2026-11-15T22:59:59Z' });
  assert.equal(displayed(beforeMidnight), null);

  const rollover = await page('index.html', [standardMenu], { now: '2026-11-16T22:59:59Z' });
  assert.ok(displayed(rollover));
  assert.ok(rollover.intervals.some(interval => interval.delay > 0 && interval.delay <= 30000), 'Open tabs must recheck the date regularly');
  rollover.advance('2026-11-16T23:00:01Z');
  await rollover.tick();
  assert.equal(displayed(rollover), null, 'Yesterday’s menu must disappear in an open tab');

  const prepared = await page('index.html', [standardMenu, { ...standardMenu, date: '2026-11-17', main: 'Menu préparé pour demain' }], { now: '2026-11-16T22:59:59Z' });
  prepared.advance('2026-11-16T23:00:01Z');
  prepared.window.dispatchEvent(new prepared.window.Event('pageshow'));
  prepared.document.dispatchEvent(new prepared.window.Event('visibilitychange'));
  await new Promise(resolve => setImmediate(resolve));
  assert.ok(displayed(prepared).textContent.includes('Menu préparé pour demain'), 'Returning to an open tab must select today’s prepared menu');
  assert.ok(!displayed(prepared).textContent.includes(standardMenu.main));

  const failed = await page('index.html', [standardMenu], { failed: ['daily-menu'] });
  assert.equal(displayed(failed), null);
  assert.equal(failed.document.querySelector('.hero h2').textContent, failed.data.home.heroTitle);
  assert.ok(failed.document.querySelector('a[href="tel:+41324810000"]'));
  const failedHome = await page('index.html', [standardMenu], { failed: ['home'] });
  assert.ok(displayed(failedHome), 'Daily menu must work independently of the home content');
  const notFound = await page('404.html', [standardMenu]);
  assert.equal(displayed(notFound), null);
  assert.ok(!notFound.calls.some(call => call.name === 'daily-menu'));

  console.log('PASS: text-only daily-menu form and legacy-photo compatibility, today on both pages, empty/past/future/invalid menus hidden, optional courses, safe text/URLs, Zurich summer/winter midnight, open-tab expiry and prepared menus, independent fetch failures.');
})().then(() => {
  for (const dom of opened) dom.window.close();
  process.exit(0);
}).catch(error => {
  for (const dom of opened) dom.window.close();
  console.error(error);
  process.exit(1);
});
