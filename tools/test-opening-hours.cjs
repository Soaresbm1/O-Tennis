// Fixed-clock checks cover customers planning a visit in a different timezone.
process.env.TZ = 'Pacific/Honolulu';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
const qaRequire = createRequire(path.join(root, '.cms-qa/package.json'));
const { JSDOM } = qaRequire('jsdom');
const source = fs.readFileSync(path.join(root, 'opening-hours.js'), 'utf8');
// Keep the planning cases independent of legitimate future edits by the manager.
const saved = { hours: [
  ['Monday', 'Lundi'], ['Tuesday', 'Mardi'], ['Wednesday', 'Mercredi'], ['Thursday', 'Jeudi'],
  ['Friday', 'Vendredi'], ['Saturday', 'Samedi'], ['Sunday', 'Dimanche']
].map(([schemaDay, day]) => ({
  schemaDay, day, closed: schemaDay === 'Monday', opens: '10:00',
  closes: ['Friday', 'Saturday'].includes(schemaDay) ? '22:30' : '22:00'
})), closures: [] };
const clone = value => JSON.parse(JSON.stringify(value));
const windows = [];

function page(now, edits) {
  const rows = saved.hours.map(day => '<tr data-weekday="' + day.schemaDay + '"><td>' + day.day + '</td><td>10h00</td></tr>').join('');
  const dom = new JSDOM('<p data-opening-status></p><p data-opening-status></p><p data-today-hours></p><table class="horaires">' + rows + '</table>', { runScripts: 'outside-only' });
  windows.push(dom.window);
  const { window } = dom;
  const NativeDate = window.Date;
  let instant = NativeDate.parse(now);
  window.Date = class extends NativeDate {
    constructor(...args) { super(...(args.length ? args : [instant])); }
    static now() { return instant; }
  };
  const timers = [];
  window.setInterval = (callback, delay) => { timers.push({ callback, delay }); return timers.length; };
  window.eval(source);
  const initial = window.document.querySelector('[data-opening-status]').textContent;
  const restaurant = clone(saved);
  if (edits) edits(restaurant);
  window.document.dispatchEvent(new window.CustomEvent('otennis:restaurant-ready', { detail: restaurant }));
  return {
    window, initial, timers,
    status() { return window.document.querySelector('[data-opening-status]'); },
    today() { return window.document.querySelector('[data-today-hours]').textContent; },
    advance(value) { instant = NativeDate.parse(value); },
    tick() { timers.forEach(timer => timer.callback()); }
  };
}

try {
  const closedMonday = page('2026-11-16T11:00:00Z');
  assert.equal(closedMonday.initial, 'Horaires à confirmer');
  assert.equal(closedMonday.status().dataset.state, 'closed');
  assert.match(closedMonday.status().textContent, /demain à 10h00/);
  assert.equal(closedMonday.today(), 'Lundi · fermé');
  assert.equal(closedMonday.window.document.querySelector('tr[aria-current="date"]').dataset.weekday, 'Monday');

  const opening = page('2026-11-17T08:59:59Z');
  assert.equal(opening.status().dataset.state, 'closed');
  assert.match(opening.status().textContent, /aujourd’hui à 10h00/);
  opening.advance('2026-11-17T09:00:00Z');
  opening.tick();
  assert.equal(opening.status().dataset.state, 'open');
  assert.match(opening.status().textContent, /jusqu’à 22h00/);
  opening.advance('2026-11-17T21:00:00Z');
  opening.window.dispatchEvent(new opening.window.Event('pageshow'));
  assert.equal(opening.status().dataset.state, 'closed');

  const summer = page('2026-07-14T08:00:00Z');
  assert.equal(summer.status().dataset.state, 'open', 'The summer opening is 08:00 UTC');
  const winter = page('2026-11-17T08:00:00Z');
  assert.equal(winter.status().dataset.state, 'closed', 'The winter opening is 09:00 UTC');
  const friday = page('2026-11-20T21:15:00Z');
  assert.equal(friday.status().dataset.state, 'open');
  assert.match(friday.status().textContent, /22h30/);

  const midnight = page('2026-11-17T22:59:59Z');
  midnight.advance('2026-11-17T23:00:01Z');
  midnight.window.document.dispatchEvent(new midnight.window.Event('visibilitychange'));
  assert.match(midnight.today(), /^Mercredi/);
  assert.equal(midnight.window.document.querySelector('tr[aria-current="date"]').dataset.weekday, 'Wednesday');
  assert.ok(midnight.timers.some(timer => timer.delay <= 30000));

  const holidays = page('2026-11-17T11:00:00Z', data => {
    data.closures = [{ start: '2026-11-17', end: '2026-11-20', reason: 'Congés annuels' }];
  });
  assert.equal(holidays.status().dataset.state, 'closed');
  assert.match(holidays.status().textContent, /Congés annuels/);
  assert.match(holidays.status().textContent, /samedi 21 novembre à 10h00/);

  const closureTomorrow = page('2026-11-17T21:30:00Z', data => {
    data.closures = [{ start: '2026-11-18', end: '2026-11-19', reason: '' }];
  });
  assert.match(closureTomorrow.status().textContent, /vendredi 20 novembre à 10h00/);

  const overlapping = page('2026-11-17T11:00:00Z', data => {
    data.closures = [{ start: '2026-11-17', end: '2026-11-20', reason: 'Vacances' }, { start: '2026-11-19', end: '2026-11-23', reason: 'Fermeture' }];
  });
  assert.match(overlapping.status().textContent, /mardi 24 novembre à 10h00/);

  const overnightEdit = data => {
    const friday = data.hours.find(day => day.schemaDay === 'Friday');
    friday.opens = '20:00'; friday.closes = '02:00';
  };
  const overnight = page('2026-11-20T23:30:00Z', overnightEdit);
  assert.equal(overnight.status().dataset.state, 'open');
  assert.match(overnight.status().textContent, /jusqu’à 02h00/);
  overnight.advance('2026-11-21T01:00:00Z');
  overnight.tick();
  assert.equal(overnight.status().dataset.state, 'closed');
  const overnightClosure = page('2026-11-20T23:30:00Z', data => {
    overnightEdit(data);
    data.closures = [{ start: '2026-11-21', end: '2026-11-21', reason: 'Fermé exceptionnellement' }];
  });
  assert.equal(overnightClosure.status().dataset.state, 'closed', 'A full-day closure wins over the previous evening');

  for (const edit of [
    data => { data.hours = []; },
    data => { delete data.hours; },
    data => { data.hours[1].opens = '25:00'; },
    data => { data.hours[1].closes = data.hours[1].opens; },
    data => { data.hours[1].closed = 'false'; },
    data => { data.hours[1].schemaDay = 'Monday'; },
    data => { data.closures = [{ start: '2026-02-30', end: '2026-03-01', reason: '' }]; },
    data => { data.closures = [{ start: '2026-12-20', end: '2026-12-01', reason: '' }]; }
  ]) {
    const test = page('2026-11-17T11:00:00Z', edit);
    assert.equal(test.status().dataset.state, 'unknown', 'Invalid data must never claim the restaurant is open');
  }
  const hostile = page('2026-11-17T11:00:00Z', data => {
    data.closures = [{ start: '2026-11-17', end: '2026-11-17', reason: '<img src=x onerror=alert(1)>' }];
  });
  assert.ok(hostile.status().textContent.includes('<img src=x onerror=alert(1)>'));
  assert.equal(hostile.window.document.querySelector('img'), null);
  assert.equal(hostile.window.document.querySelectorAll('[data-opening-status]')[1].textContent, hostile.status().textContent);
  console.log('PASS: Swiss opening hours, day highlighting, precise boundaries, summer/winter time, midnight refresh, temporary closures, next reopening, overnight service and safe unknown states.');
} finally {
  windows.forEach(window => window.close());
}
