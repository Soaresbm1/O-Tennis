// Verify saved content fidelity, shared updates and untrusted input without a browser dependency in production.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
const qaRequire = createRequire(path.join(root, '.cms-qa/package.json'));
const { JSDOM } = qaRequire('jsdom');
const YAML = qaRequire('yaml');
const script = fs.readFileSync(path.join(root, 'content.js'), 'utf8');
const schema = YAML.parse(fs.readFileSync(path.join(root, '.pages.yml'), 'utf8'));
const initial = Object.fromEntries(schema.content.map(entry => [path.basename(entry.path, '.json'), JSON.parse(fs.readFileSync(path.join(root, entry.path), 'utf8'))]));
for (const entry of schema.content) {
  assert.equal(entry.format, 'json');
  const value = initial[path.basename(entry.path, '.json')];
  function covered(fields, object) {
    for (const key of Object.keys(object)) {
      const field = fields.find(field => field.name === key);
      assert.ok(field, 'CMS must preserve editable key: ' + key);
      if (field.type === 'object') {
        for (const child of Array.isArray(object[key]) ? object[key] : [object[key]]) covered(field.fields, child);
      }
    }
  }
  covered(entry.fields, value);
}
async function page(filename, data = initial, failed = []) {
  const dom = new JSDOM(fs.readFileSync(path.join(root, filename), 'utf8'), { url: 'https://restaurant-buvette-otennis.ch/' + filename, runScripts: 'outside-only' });
  const { window } = dom;
  window.HTMLElement.prototype.scrollIntoView = function () {};
  const calls = [];
  window.fetch = async (url, options) => {
    const name = path.basename(new URL(url).pathname, '.json');
    calls.push({ name, options });
    if (failed.includes(name)) throw new Error('Simulated outage');
    return { ok: true, json: async () => JSON.parse(JSON.stringify(data[name])) };
  };
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Content did not finish loading')), 5000);
    window.document.addEventListener('otennis:content-ready', () => { clearTimeout(timeout); resolve(); }, { once: true });
    window.eval(script);
  });
  return { dom, document: window.document, calls };
}
(async () => {
  const original = new JSDOM(fs.readFileSync(path.join(root, 'menu.html'), 'utf8'));
  const savedItems = initial.menu.categories.flatMap(category => category.groups.flatMap(group => group.items));
  const fallbackItems = original.window.document.querySelectorAll('.plat, .liste-simple li').length;
  const menu = await page('menu.html');
  assert.notEqual(menu.document.documentElement.dataset.contentStatus, 'fallback');
  assert.equal(menu.document.querySelectorAll('.categorie-menu').length, initial.menu.categories.length);
  assert.equal(menu.document.querySelectorAll('.menu-item-name').length, savedItems.length);
  const normalize = value => value.replace(/\s+/g, ' ').trim();
  const savedText = value => typeof value === 'string' ? normalize(value) : '';
  const savedNames = savedItems.map(item => savedText(item.name));
  const newNames = [...menu.document.querySelectorAll('.menu-item-name')].map(element => normalize(element.textContent));
  assert.deepEqual(newNames, savedNames, 'Every saved menu item must render in order');
  const savedPrices = savedItems.flatMap(item => [
    ...(typeof item.price === 'string' && item.price ? [savedText(item.price)] : []),
    ...(Array.isArray(item.portions) ? item.portions.map(portion => savedText(portion.price)) : [])
  ]);
  const newPrices = [...menu.document.querySelectorAll('.plat-prix, .plat-tailles strong')].map(element => normalize(element.textContent));
  assert.deepEqual(newPrices, savedPrices, 'Every saved price must render in order');
  assert.equal(menu.document.querySelectorAll('.menu-nav a').length, initial.menu.categories.length);
  menu.document.querySelectorAll('.menu-nav a').forEach(link => assert.ok(menu.document.getElementById(link.hash.slice(1))));

  const edited = JSON.parse(JSON.stringify(initial));
  edited.home.heroTitle = 'Bienvenue au restaurant';
  edited.home.photo = '/image/logo.jpeg';
  edited.home.announcement = 'Congés du 1er au 8 novembre';
  edited.restaurant.phone = '032 481 00 00';
  edited.restaurant.hours[4].closes = '23:00';
  edited.restaurant.hours[0].closed = false;
  edited.restaurant.email = 'contact@example.com';
  edited.restaurant.facebook = 'https://www.facebook.com/otennis';
  edited.restaurant.groupReservation = 'Pour votre repas de groupe, appelez-nous.';
  edited.restaurant.preorderNote = 'Plats sur commande : contactez-nous la veille.';
  edited.restaurant.mapAddress = 'Rue de test 12, 2732 Reconvilier';
  edited.menu.categories[0].groups[0].items[0].price = '8.50 CHF';
  edited.menu.categories[0].groups[0].items[0].image = '/image/logo.jpeg';
  edited.menu.categories[0].groups[0].items.push({ name: 'Nouvelle boisson', price: '4.- CHF', description: 'Maison', image: '', portions: [] });
  const home = await page('index.html', edited);
  assert.notEqual(home.document.documentElement.dataset.contentStatus, 'fallback');
  assert.equal(home.document.querySelector('.hero-title').textContent, edited.home.heroTitle);
  assert.match(home.document.querySelector('#photo-terrasse').src, /image\/logo\.jpeg$/);
  assert.equal(home.document.querySelector('#restaurant-announcement').textContent, edited.home.announcement);
  assert.match(home.document.querySelector('.horaires').textContent, /23h00/);
  assert.ok([...home.document.querySelectorAll('a[href="tel:+41324810000"]')].length >= 2);
  assert.ok([...home.document.querySelectorAll('a[href="mailto:contact@example.com"]')].length >= 2);
  assert.ok(home.document.querySelector('.manager-link'));
  assert.equal(home.document.querySelector('.header-call').getAttribute('href'), 'tel:+41324810000');
  assert.equal(home.document.querySelector('.hero [data-call]').textContent, 'Réserver par téléphone', 'Editing the menu button must not relabel the reservation button');
  assert.equal(home.document.querySelector('.reservation-section'), null);
  home.document.querySelectorAll('[data-directions]').forEach(link => {
    assert.equal(new URL(link.href).searchParams.get('destination'), edited.restaurant.mapAddress);
    assert.equal(new URL(link.href).hostname, 'www.google.com');
  });
  const structured = JSON.parse(home.document.querySelector('script[type="application/ld+json"]').textContent);
  assert.ok(structured.openingHoursSpecification.some(day => day.dayOfWeek === 'Friday' && day.closes === '23:00'));
  assert.ok(structured.openingHoursSpecification.some(day => day.dayOfWeek === 'Monday'));
  assert.equal(structured.telephone, '+41324810000');
  assert.match(structured.image, /image\/logo\.jpeg$/);
  const updatedMenu = await page('menu.html', edited);
  assert.equal(updatedMenu.document.querySelector('[data-group-reservation]').textContent, edited.restaurant.groupReservation);
  assert.equal(updatedMenu.document.querySelector('[data-preorder-note]').textContent, edited.restaurant.preorderNote);
  assert.equal(updatedMenu.document.querySelector('.plat-prix').textContent, '8.50 CHF');
  assert.equal(updatedMenu.document.querySelectorAll('.menu-item-name').length, savedItems.length + 1);
  assert.ok(updatedMenu.document.querySelector('.article-photo, .plat-photo'));
  assert.ok(updatedMenu.calls.every(call => call.options.cache === 'no-cache' && call.options.credentials === 'omit'));

  edited.menu.categories[0].groups[0].items[0].name = '<img src=x onerror=alert(1)>';
  edited.menu.categories[0].groups[0].items[0].image = 'javascript:alert(1)';
  edited.restaurant.facebook = 'javascript:alert(1)';
  const hostile = await page('menu.html', edited);
  assert.equal(hostile.document.querySelector('.menu-item-name').textContent, '<img src=x onerror=alert(1)>');
  assert.equal(hostile.document.querySelectorAll('[onerror], a[href^="javascript:"], img[src^="javascript:"]').length, 0);
  const failed = await page('menu.html', initial, ['menu']);
  assert.equal(failed.document.querySelectorAll('.plat, .liste-simple li').length, fallbackItems);
  assert.equal(failed.document.documentElement.dataset.contentStatus, 'fallback');
  const missing = await page('404.html', edited);
  assert.notEqual(missing.document.documentElement.dataset.contentStatus, 'fallback');
  assert.ok(missing.document.querySelector('a[href="tel:+41324810000"]'));
  for (const test of [menu, home, updatedMenu, hostile, failed, missing]) test.dom.window.close();
  original.window.close();
  console.log('PASS: CMS schema, all ' + savedItems.length + ' saved items and prices, shared phone/email, hours and schema.org, home photo/announcement, added item/photo, safe text/URLs, failed-fetch fallback, 404 contact.');
})().then(() => process.exit(0)).catch(error => { console.error(error); process.exit(1); });
