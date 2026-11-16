const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
const { JSDOM } = createRequire(path.join(root, '.cms-qa/package.json'))('jsdom');
const source = fs.readFileSync(path.join(root, 'menu-tabs.js'), 'utf8');
const fixture = '<section id="menu"><nav class="menu-nav"><a href="#plats">Plats</a><a href="#boissons">Boissons</a><a href="#vins">Vins</a></nav><div class="categorie-menu" id="plats"><h3>Plats</h3><p id="specialite">Spécialité maison</p></div><div class="categorie-menu" id="boissons"><h3>Boissons</h3><p>Thé froid</p></div><div class="categorie-menu" id="vins"><h3>Vins</h3><p>Pinot noir</p></div></section>';
const opened = [];

async function page({ html = fixture, hash = '', page = 'menu', enhance = true } = {}) {
  const dom = new JSDOM('<!doctype html><html lang="fr"><body data-page="' + page + '">' + html + '</body></html>', {
    url: 'https://restaurant-buvette-otennis.ch/menu.html' + hash, runScripts: 'outside-only'
  });
  opened.push(dom);
  const { window } = dom;
  const scrolls = [];
  window.HTMLElement.prototype.scrollIntoView = function () {
    const panel = this.closest('.categorie-menu');
    scrolls.push({ id: this.id, visible: Boolean(panel && !panel.hidden) });
  };
  if (enhance) {
    window.eval(source);
    if (window.document.readyState === 'loading') await new Promise(resolve => window.document.addEventListener('DOMContentLoaded', resolve, { once: true }));
  }
  return { window, document: window.document, scrolls };
}

function visible(document) {
  return [...document.querySelectorAll('.categorie-menu')].filter(panel => !panel.hidden).map(panel => panel.id);
}

(async () => {
  const fallback = await page({ enhance: false });
  assert.deepEqual(visible(fallback.document), ['plats', 'boissons', 'vins'], 'The whole menu remains readable without this enhancement');

  const test = await page();
  const tabs = [...test.document.querySelectorAll('[role="tab"]')];
  assert.equal(test.document.querySelector('.menu-nav').getAttribute('role'), 'tablist');
  assert.deepEqual(visible(test.document), ['plats']);
  assert.equal(test.document.querySelectorAll('.categorie-menu p').length, 3, 'Switching tabs must preserve every item in the document');
  tabs.forEach((tab, index) => {
    const panel = test.document.getElementById(tab.getAttribute('aria-controls'));
    assert.equal(panel.getAttribute('role'), 'tabpanel');
    assert.equal(panel.getAttribute('aria-labelledby'), tab.id);
    assert.equal(tab.tabIndex, index === 0 ? 0 : -1);
  });
  tabs[1].click();
  assert.deepEqual(visible(test.document), ['boissons']);
  assert.equal(test.window.location.hash, '#boissons');
  assert.equal(tabs[1].getAttribute('aria-selected'), 'true');
  assert.equal(tabs[0].getAttribute('aria-selected'), 'false');

  function key(tab, key) { tab.dispatchEvent(new test.window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })); }
  key(tabs[1], 'ArrowRight');
  assert.deepEqual(visible(test.document), ['vins']);
  assert.equal(test.document.activeElement, tabs[2]);
  key(tabs[2], 'ArrowRight');
  assert.deepEqual(visible(test.document), ['plats'], 'Keyboard navigation wraps to the first category');
  key(tabs[0], 'ArrowLeft');
  assert.deepEqual(visible(test.document), ['vins']);
  key(tabs[2], 'Home');
  assert.deepEqual(visible(test.document), ['plats']);
  key(tabs[0], 'End');
  assert.deepEqual(visible(test.document), ['vins']);

  test.window.history.replaceState(null, '', '#boissons');
  test.window.dispatchEvent(new test.window.PopStateEvent('popstate'));
  assert.deepEqual(visible(test.document), ['boissons'], 'Back and forward navigation select the category in the URL');
  test.window.history.replaceState(null, '', '#specialite');
  test.window.dispatchEvent(new test.window.HashChangeEvent('hashchange'));
  assert.deepEqual(visible(test.document), ['plats'], 'Links to content within a hidden category reveal its panel');
  test.window.history.replaceState(null, '', '#%E0%A4%A');
  assert.doesNotThrow(() => test.window.dispatchEvent(new test.window.HashChangeEvent('hashchange')));
  assert.deepEqual(visible(test.document), ['plats']);

  const deep = await page({ hash: '#specialite' });
  assert.deepEqual(visible(deep.document), ['plats']);
  assert.deepEqual(deep.scrolls, [{ id: 'specialite', visible: true }], 'Initial deep links scroll only after revealing their panel');
  const deepDrink = await page({ hash: '#boissons' });
  assert.deepEqual(visible(deepDrink.document), ['boissons']);
  assert.deepEqual(deepDrink.scrolls, [{ id: 'boissons', visible: true }]);

  // The CMS replaces the menu after its fetch: new elements must receive fresh controls.
  test.document.body.innerHTML = fixture;
  test.window.history.replaceState(null, '', '#vins');
  const scrollsBeforeReplace = test.scrolls.length;
  test.document.dispatchEvent(new test.window.CustomEvent('otennis:content-ready'));
  assert.deepEqual(visible(test.document), ['vins']);
  assert.deepEqual(test.scrolls.slice(scrollsBeforeReplace), [{ id: 'vins', visible: true }], 'CMS replacement scrolls to the selected panel after layout changes');
  test.document.dispatchEvent(new test.window.CustomEvent('otennis:content-ready'));
  assert.equal(test.document.querySelectorAll('[role="tab"]').length, 3, 'Repeated completion events must not duplicate controls');
  test.document.querySelector('[aria-controls="boissons"]').click();
  assert.deepEqual(visible(test.document), ['boissons']);

  const home = await page({ page: 'home' });
  assert.equal(home.document.querySelector('[role="tab"]'), null, 'The home page must not be altered');
  assert.equal(visible(home.document).length, 3);
  const collision = await page({ html: '<p id="category-tab-plats">Existing identifier</p>' + fixture });
  assert.notEqual(collision.document.querySelector('[role="tab"]').id, 'category-tab-plats');
  assert.equal(collision.document.querySelectorAll('#category-tab-plats').length, 1);

  console.log('PASS: progressive menu tabs, complete retained content, accessible labels and roving focus, keyboard navigation, category/descendant URLs, history, CMS replacement and safe invalid hashes.');
})().then(() => {
  for (const dom of opened) dom.window.close();
}).catch(error => {
  for (const dom of opened) dom.window.close();
  console.error(error);
  process.exitCode = 1;
});
