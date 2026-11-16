// Gallery content, keyboard browsing and graceful fallback without a browser dependency in production.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
const qaRequire = createRequire(path.join(root, '.cms-qa/package.json'));
const { JSDOM, VirtualConsole } = qaRequire('jsdom');
const source = fs.readFileSync(path.join(root, 'gallery.js'), 'utf8');
const configured = JSON.parse(fs.readFileSync(path.join(root, 'data/gallery.json'), 'utf8'));
// Keep behavior tests deterministic even when the manager edits or empties the live gallery.
const initial = { items: [
  { image: '/image/gallery/salle.jpg', alt: 'Tables et chaises dans la salle', caption: 'La salle du restaurant' },
  { image: '/image/gallery/terrasse.webp', alt: 'Les fauteuils de la terrasse', caption: 'La terrasse' }
] };
const opened = [];

async function gallery(data = initial, options = {}) {
  const virtualConsole = new VirtualConsole();
  const dom = new JSDOM('<!doctype html><html lang="fr"><body><section id="galerie"><div id="gallery-grid"><a class="fallback" href="image/terrasse.jpg">Photo de secours</a></div></section></body></html>', {
    url: 'https://example.com/restaurant/index.html', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole
  });
  opened.push(dom);
  const { window } = dom;
  if (!options.noDialog) {
    window.HTMLDialogElement.prototype.showModal = function () {
      this.open = true;
      this.querySelector('button').focus();
    };
    window.HTMLDialogElement.prototype.close = function () {
      this.open = false;
      this.dispatchEvent(new window.Event('close'));
    };
  }
  const calls = [];
  window.fetch = async (url, requestOptions) => {
    calls.push({ url: url.href, options: requestOptions });
    if (options.failed) throw new Error('Simulated outage');
    return { ok: !options.httpError, json: async () => data };
  };
  let status;
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Gallery loading timed out')), 5000);
    window.document.addEventListener('otennis:gallery-ready', event => {
      clearTimeout(timer);
      status = event.detail.status;
      resolve();
    }, { once: true });
    window.eval(source);
  });
  return { dom, window, document: window.document, calls, status };
}

(async () => {
  assert.ok(Array.isArray(configured.items));
  for (const item of configured.items) {
    assert.ok(fs.statSync(path.join(root, item.image)).size > 0, 'Every selected photo must exist');
    assert.ok(item.alt && item.caption, 'Photos need descriptive accessible labels');
  }
  const photos = await gallery();
  assert.equal(photos.status, 'ready');
  assert.equal(photos.document.querySelectorAll('.gallery-card').length, initial.items.length);
  assert.equal(photos.calls[0].url, 'https://example.com/restaurant/data/gallery.json');
  assert.equal(photos.calls[0].options.cache, 'no-cache');
  assert.equal(photos.calls[0].options.credentials, 'omit');
  const links = photos.document.querySelectorAll('.gallery-photo-link');
  assert.equal(links[0].href, 'https://example.com/restaurant/image/gallery/salle.jpg', 'Subpath hosting must work');
  links[0].focus();
  links[0].click();
  const dialog = photos.document.querySelector('dialog');
  assert.ok(dialog.open);
  assert.equal(dialog.querySelector('#gallery-view-title').textContent, initial.items[0].caption);
  assert.equal(dialog.getAttribute('aria-labelledby'), 'gallery-view-title');
  assert.equal(photos.document.activeElement.className, 'gallery-view-close');
  assert.ok(photos.document.body.classList.contains('gallery-viewing'));
  const controls = dialog.querySelectorAll('.gallery-view-controls button');
  controls[1].click();
  assert.equal(dialog.querySelector('#gallery-view-title').textContent, initial.items[1].caption);
  dialog.dispatchEvent(new photos.window.KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }));
  assert.equal(dialog.querySelector('#gallery-view-title').textContent, initial.items[0].caption);
  dialog.dispatchEvent(new photos.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
  assert.equal(dialog.open, false);
  assert.equal(photos.document.activeElement, links[0], 'Closing a photo must restore keyboard focus');
  assert.ok(!photos.document.body.classList.contains('gallery-viewing'));

  for (const modifiers of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }]) {
    let intercepted;
    const observe = event => { intercepted = event.defaultPrevented; event.preventDefault(); };
    links[0].addEventListener('click', observe, { once: true });
    links[0].dispatchEvent(new photos.window.MouseEvent('click', { bubbles: true, cancelable: true, ...modifiers }));
    assert.equal(intercepted, false, 'Modified clicks must keep native link behavior');
    assert.equal(dialog.open, false);
  }

  const single = await gallery({ items: [{ ...initial.items[0], price: '22.50 CHF' }] });
  single.document.querySelector('.gallery-photo-link').click();
  assert.ok([...single.document.querySelectorAll('.gallery-view-controls button')].every(button => button.disabled));
  assert.equal(single.document.querySelector('.gallery-view-price').textContent, '22.50 CHF');
  single.document.querySelector('.gallery-view-photo').dispatchEvent(new single.window.Event('error'));
  assert.ok(!single.document.querySelector('.gallery-view-error').hidden);
  assert.ok(single.document.querySelector('.gallery-view-photo').hidden);

  const attack = '<img src=x onerror=alert(1)>';
  const safe = await gallery({ items: [
    { ...initial.items[0], caption: attack, price: attack },
    { image: 'javascript:alert(1)', caption: 'Invalid' },
    { image: '/image/%2e%2e/secret.jpg', caption: 'Traversal' },
    { image: 'https://untrusted.example/picture.jpg', caption: 'External' },
    null
  ] });
  assert.equal(safe.document.querySelectorAll('.gallery-card').length, 1);
  assert.equal(safe.document.querySelector('.gallery-card h3').textContent, attack);
  assert.equal(safe.document.querySelectorAll('[onerror], a[href^="javascript:"]').length, 0);

  for (const data of [{ items: [] }, { items: [{ image: 'invalid.jpg' }] }]) {
    const empty = await gallery(data);
    assert.equal(empty.status, 'empty');
    assert.ok(empty.document.querySelector('#galerie').hidden);
  }
  for (const options of [{ failed: true }, { httpError: true }]) {
    const failed = await gallery(initial, options);
    assert.equal(failed.status, 'fallback');
    assert.ok(failed.document.querySelector('.fallback'));
    assert.ok(!failed.document.querySelector('#galerie').hidden);
  }
  const invalid = await gallery({ items: 'bad data' });
  assert.equal(invalid.status, 'fallback');
  assert.ok(invalid.document.querySelector('.fallback'));
  const unavailable = await gallery({ items: [initial.items[0]] });
  unavailable.document.querySelector('.gallery-card img').dispatchEvent(new unavailable.window.Event('error'));
  assert.equal(unavailable.document.querySelectorAll('.gallery-card').length, 0);
  assert.ok(unavailable.document.querySelector('#galerie').hidden);

  const unsupported = await gallery(initial, { noDialog: true });
  const anchor = unsupported.document.querySelector('.gallery-photo-link');
  let intercepted;
  anchor.addEventListener('click', event => { intercepted = event.defaultPrevented; event.preventDefault(); });
  anchor.click();
  assert.equal(intercepted, false, 'Unsupported dialogs must leave normal image navigation available');
  assert.equal(unsupported.document.querySelector('dialog'), null);
  console.log('PASS: editable gallery, local photos, subpath URLs, photo navigation and Escape/focus, native modified clicks, single photo, safe text/URLs, missing images, empty gallery and content/dialog fallbacks.');
})().then(() => {
  opened.forEach(dom => dom.window.close());
  process.exit(0);
}).catch(error => {
  opened.forEach(dom => dom.window.close());
  console.error(error);
  process.exit(1);
});
