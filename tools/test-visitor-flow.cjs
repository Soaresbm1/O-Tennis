// Exercise the actual HTML, scripts and content over a local HTTP preview.
const assert = require('node:assert/strict');
const path = require('node:path');
const { createRequire } = require('node:module');
const qaRequire = createRequire(path.resolve(__dirname, '../.cms-qa/package.json'));
const { JSDOM, ResourceLoader, VirtualConsole } = qaRequire('jsdom');
const base = new URL(process.argv[2] || 'http://127.0.0.1:8090/');
let saved;
class LocalResources extends ResourceLoader {
  fetch(url, options) {
    if (new URL(url).origin !== base.origin) return null;
    return super.fetch(url, options);
  }
}

async function visit(file, gallery = false) {
  const errors = [];
  const console = new VirtualConsole();
  console.on('jsdomError', error => { errors.push(error); });
  let ready;
  const completed = new Promise(resolve => { ready = resolve; });
  const dom = await JSDOM.fromURL(new URL(file, base).href, {
    resources: new LocalResources(), runScripts: 'dangerously', virtualConsole: console,
    beforeParse(window) {
      window.HTMLElement.prototype.scrollIntoView = function () {};
      window.fetch = (url, options) => fetch(new URL(url, base), options);
      const waiting = new Set(gallery ? ['otennis:content-ready', 'otennis:gallery-ready'] : ['otennis:content-ready']);
      for (const name of waiting) window.document.addEventListener(name, () => {
        waiting.delete(name);
        if (!waiting.size) ready();
      }, { once: true });
    }
  });
  try {
    let timer;
    try { await Promise.race([completed, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Visitor flow timed out: ' + file)), 8000); })]); }
    finally { clearTimeout(timer); }
    const document = dom.window.document;
    assert.deepEqual(errors, [], 'The actual page scripts must load without errors');
    assert.notEqual(document.documentElement.dataset.contentStatus, 'fallback');
    assert.match(document.querySelector('.header-call').href, /^tel:\+41/);
    assert.ok(['open', 'closed'].includes(document.querySelector('[data-opening-status]').dataset.state));
    assert.equal(document.querySelector('[data-group-reservation]').textContent, saved.restaurant.groupReservation);
    assert.equal(document.querySelector('[data-preorder-note]').textContent, saved.restaurant.preorderNote);
    document.querySelectorAll('[data-directions]').forEach(link => {
      const url = new URL(link.href);
      assert.equal(url.origin, 'https://www.google.com');
      assert.equal(url.searchParams.get('destination'), saved.restaurant.mapAddress);
    });
    const toggle = document.querySelector('.nav-toggle');
    toggle.click();
    assert.equal(toggle.getAttribute('aria-expanded'), 'true');
    document.querySelector('.main-nav a').click();
    assert.equal(toggle.getAttribute('aria-expanded'), 'false');
    if (gallery) {
      assert.equal(document.querySelector('.hero [data-call]').textContent, 'Réserver par téléphone');
      assert.equal(document.querySelectorAll('#gallery-grid .gallery-card').length, saved.gallery.items.length);
      assert.equal(document.querySelector('#gallery-grid').getAttribute('aria-roledescription'), 'carrousel');
      assert.equal(document.querySelectorAll('.gallery-carousel-controls').length, 1, 'The carousel should initialize once across fallback and editable photos');
      assert.ok(document.querySelector('.horaires .is-today'));
      for (const photo of document.querySelectorAll('#gallery-grid img')) {
        const response = await fetch(photo.src);
        assert.equal(response.status, 200, 'Every gallery image must be served');
        assert.ok(Number(response.headers.get('content-length')) > 0);
        await response.arrayBuffer();
      }
    } else {
      const tabs = [...document.querySelectorAll('[role="tab"]')];
      assert.equal(tabs.length, saved.menu.categories.length);
      assert.equal(tabs[0].getAttribute('aria-controls'), saved.menu.categories[0].id);
      assert.equal(document.querySelectorAll('[role="tabpanel"]:not([hidden])').length, 1);
      const alternative = tabs[1] || tabs[0];
      alternative.click();
      assert.equal(alternative.getAttribute('aria-selected'), 'true');
      assert.equal(document.querySelectorAll('[role="tabpanel"]:not([hidden])').length, 1);
      const items = saved.menu.categories.flatMap(category => category.groups.flatMap(group => group.items));
      assert.equal(document.querySelectorAll('.menu-item-name').length, items.length);
    }
  } finally { dom.window.close(); }
}

(async () => {
  saved = Object.fromEntries(await Promise.all(['restaurant', 'gallery', 'menu'].map(async name => {
    const response = await fetch(new URL('data/' + name + '.json', base));
    assert.equal(response.status, 200);
    return [name, await response.json()];
  })));
  await visit('index.html', true);
  await visit('menu.html');
  console.log('PASS: actual HTTP visitor flow, script integration, mobile menu, call/directions, opening status, reservation notes, served gallery photos and category tabs.');
})().catch(error => { console.error(error); process.exitCode = 1; });
