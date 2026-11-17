// Verify carousel navigation against desktop/mobile layout fixtures and CMS photo changes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const qaRequire = createRequire(path.resolve(__dirname, '../.cms-qa/package.json'));
const { JSDOM } = qaRequire('jsdom');
const script = fs.readFileSync(path.resolve(__dirname, '../gallery-carousel.js'), 'utf8');
const opened = [];

async function fixture(options = {}) {
  const dom = new JSDOM('<!doctype html><html lang="fr"><body><section id="galerie"><div id="gallery-grid"></div></section></body></html>', { url: 'https://example.com/', runScripts: 'outside-only' });
  opened.push(dom);
  const { window } = dom;
  const grid = window.document.getElementById('gallery-grid');
  const layout = { width: 944, card: 300, gap: 22, ...options.layout };
  const calls = [];
  const cards = () => [...grid.children];
  function replace(count) {
    grid.replaceChildren(...Array.from({ length: count }, (_, index) => {
      const figure = window.document.createElement('figure');
      figure.className = 'gallery-card';
      const link = window.document.createElement('a');
      link.className = 'gallery-photo-link';
      link.href = '/image/photo-' + index + '.jpg';
      link.textContent = 'Photo ' + (index + 1);
      figure.append(link);
      figure.getBoundingClientRect = () => {
        const left = 50 + cards().indexOf(figure) * (layout.card + layout.gap) - grid.scrollLeft;
        return { left, right: left + layout.card, width: layout.card };
      };
      return figure;
    }));
  }
  replace(options.count === undefined ? 6 : options.count);
  Object.defineProperty(grid, 'clientWidth', { get: () => layout.width });
  Object.defineProperty(grid, 'scrollWidth', { get: () => Math.max(layout.width, cards().length * layout.card + Math.max(0, cards().length - 1) * layout.gap) });
  grid.getBoundingClientRect = () => ({ left: 50, right: 50 + layout.width, width: layout.width });
  window.matchMedia = () => ({ matches: Boolean(options.reduced) });
  if (!options.noScrollTo) grid.scrollTo = request => {
    calls.push(request);
    grid.scrollLeft = request.left;
    grid.dispatchEvent(new window.Event('scroll'));
  };
  window.eval(script);
  await new Promise(resolve => setImmediate(resolve));
  const document = window.document;
  const previous = () => document.querySelector('.gallery-carousel-prev');
  const next = () => document.querySelector('.gallery-carousel-next');
  const status = () => document.querySelector('.gallery-carousel-status').textContent;
  const key = (name, target = grid, modifiers = {}) => {
    const event = new window.KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true, ...modifiers });
    target.dispatchEvent(event);
    return event;
  };
  return { dom, window, document, grid, layout, calls, replace, previous, next, status, key };
}

(async () => {
  const desktop = await fixture();
  assert.equal(desktop.grid.getAttribute('aria-roledescription'), 'carrousel');
  assert.equal(desktop.grid.getAttribute('aria-label'), 'Photos du restaurant');
  assert.equal(desktop.grid.tabIndex, 0);
  assert.equal(desktop.status(), 'Photos 1 à 3 sur 6');
  assert.ok(desktop.previous().disabled);
  assert.ok(!desktop.next().disabled);
  assert.equal(desktop.next().getAttribute('aria-controls'), desktop.grid.id);
  desktop.next().click();
  assert.equal(desktop.grid.scrollLeft, 322);
  assert.equal(desktop.status(), 'Photos 2 à 4 sur 6');
  assert.equal(desktop.calls.at(-1).behavior, 'smooth');
  desktop.previous().click();
  assert.equal(desktop.grid.scrollLeft, 0);
  assert.ok(desktop.key('End').defaultPrevented);
  assert.equal(desktop.status(), 'Photos 4 à 6 sur 6');
  assert.ok(desktop.next().disabled);
  desktop.key('Home');
  assert.equal(desktop.grid.scrollLeft, 0);
  desktop.key('ArrowRight');
  desktop.key('ArrowLeft');
  assert.equal(desktop.grid.scrollLeft, 0);
  assert.ok(!desktop.key('ArrowRight', desktop.grid, { ctrlKey: true }).defaultPrevented);
  assert.ok(!desktop.key('Enter').defaultPrevented);
  const link = desktop.grid.querySelector('a');
  assert.ok(!desktop.key('ArrowRight', link).defaultPrevented, 'Links keep their own keyboard behavior');
  let photoClicked = false;
  link.addEventListener('click', event => { photoClicked = true; event.preventDefault(); });
  link.click();
  assert.ok(photoClicked, 'The gallery lightbox click path remains available');

  // Finger/trackpad scrolling must update the same visible range and edge states.
  desktop.grid.scrollLeft = 644;
  desktop.grid.dispatchEvent(new desktop.window.Event('scroll'));
  assert.equal(desktop.status(), 'Photos 3 à 5 sur 6');
  desktop.layout.width = desktop.layout.card = 340;
  desktop.layout.gap = 18;
  desktop.grid.scrollLeft = 0;
  desktop.window.dispatchEvent(new desktop.window.Event('resize'));
  assert.equal(desktop.status(), 'Photo 1 sur 6');
  desktop.next().click();
  assert.equal(desktop.grid.scrollLeft, 358);
  assert.equal(desktop.status(), 'Photo 2 sur 6');

  // A ready event after a CMS replacement reuses the controls, while removed photos update totals.
  desktop.replace(4);
  desktop.grid.scrollLeft = 0;
  desktop.document.dispatchEvent(new desktop.window.CustomEvent('otennis:gallery-ready'));
  desktop.document.dispatchEvent(new desktop.window.CustomEvent('otennis:gallery-ready'));
  assert.equal(desktop.document.querySelectorAll('.gallery-carousel-controls').length, 1);
  assert.equal(desktop.status(), 'Photo 1 sur 4');
  desktop.grid.lastElementChild.remove();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(desktop.status(), 'Photo 1 sur 3');
  desktop.next().click();
  assert.equal(desktop.grid.scrollLeft, 358, 'Repeated ready events must not duplicate click handlers');

  const reduced = await fixture({ reduced: true });
  reduced.next().click();
  assert.equal(reduced.calls.at(-1).behavior, 'auto');
  const legacy = await fixture({ noScrollTo: true });
  legacy.next().click();
  assert.equal(legacy.grid.scrollLeft, 322);
  assert.equal(legacy.status(), 'Photos 2 à 4 sur 6');
  for (const count of [0, 1, 3]) {
    const small = await fixture({ count });
    assert.ok(small.document.querySelector('.gallery-carousel-controls').hidden, 'Controls hide when every photo already fits');
    assert.ok(small.previous().disabled && small.next().disabled);
    assert.equal(small.grid.tabIndex, count ? 0 : -1);
  }
  const noLayout = await fixture({ layout: { width: 0, card: 0, gap: 0 } });
  assert.ok(noLayout.document.querySelector('.gallery-carousel-controls').hidden, 'No layout engines must not expose broken controls');
  console.log('PASS: carousel desktop/mobile ranges, arrows and keyboard, native scrolling, edge controls, CMS replacement/removal, reduced motion, legacy scrolling and empty/single/no-layout fallback.');
})().then(() => {
  opened.forEach(dom => dom.window.close());
  process.exit(0);
}).catch(error => {
  opened.forEach(dom => dom.window.close());
  console.error(error);
  process.exit(1);
});
