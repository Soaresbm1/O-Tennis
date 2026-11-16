// Opening information uses the manager's saved hours and the restaurant's Swiss clock.
(function () {
  'use strict';
  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const names = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  let restaurant = null;

  const text = value => typeof value === 'string' ? value.trim() : '';
  const formatTime = value => value.replace(':', 'h');
  function minutes(value) {
    const clean = text(value);
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(clean)) return null;
    return Number(clean.slice(0, 2)) * 60 + Number(clean.slice(3));
  }
  function date(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text(value))) return '';
    const parsed = new Date(value + 'T12:00:00Z');
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value ? value : '';
  }
  function addDays(day, amount) {
    const parsed = new Date(day + 'T12:00:00Z');
    parsed.setUTCDate(parsed.getUTCDate() + amount);
    return parsed.toISOString().slice(0, 10);
  }
  function weekday(day) { return new Date(day + 'T12:00:00Z').getUTCDay(); }
  function swissNow() {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Zurich', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date());
    const part = type => parts.find(value => value.type === type).value;
    const day = part('year') + '-' + part('month') + '-' + part('day');
    return { date: day, weekday: weekday(day), minute: Number(part('hour')) * 60 + Number(part('minute')) };
  }
  function settings() {
    const hours = restaurant && Array.isArray(restaurant.hours) ? restaurant.hours : [];
    const schedule = new Map();
    let valid = hours.length === 7;
    hours.forEach(item => {
      if (!item || !weekdays.includes(item.schemaDay) || schedule.has(item.schemaDay)) { valid = false; return; }
      if (item.closed === true) schedule.set(item.schemaDay, { closed: true });
      else {
        const opens = minutes(item.opens), closes = minutes(item.closes);
        if (item.closed !== false || opens === null || closes === null || opens === closes) valid = false;
        schedule.set(item.schemaDay, { closed: false, opens, closes, opening: text(item.opens), closing: text(item.closes) });
      }
    });
    if (schedule.size !== 7) valid = false;
    const rawClosures = restaurant && restaurant.closures;
    const closures = [];
    if (rawClosures !== undefined && !Array.isArray(rawClosures)) valid = false;
    (Array.isArray(rawClosures) ? rawClosures : []).forEach(item => {
      if (!item || !date(item.start) || !date(item.end) || item.end < item.start) { valid = false; return; }
      closures.push({ start: item.start, end: item.end, reason: text(item.reason) });
    });
    return { valid, schedule, closures };
  }
  function closureOn(day, closures) {
    const matches = closures.filter(item => item.start <= day && day <= item.end);
    if (!matches.length) return null;
    return { end: matches.reduce((end, item) => item.end > end ? item.end : end, matches[0].end), reason: matches.map(item => item.reason).find(Boolean) || '' };
  }
  function nextOpening(now, config) {
    let day = now.date;
    // A closure can skip any number of calendar days. Between closures, one week is enough.
    const limit = (config.closures.length + 1) * 8;
    for (let step = 0; step < limit; step++) {
      const closure = closureOn(day, config.closures);
      if (closure) { day = addDays(closure.end, 1); continue; }
      const hours = config.schedule.get(weekdays[weekday(day)]);
      if (!hours.closed && (day !== now.date || now.minute < hours.opens)) return { date: day, opens: hours.opening };
      day = addDays(day, 1);
    }
    return null;
  }
  function openingLabel(next, today) {
    const prefix = next.date === today ? 'aujourd’hui' : next.date === addDays(today, 1) ? 'demain' : new Intl.DateTimeFormat('fr-CH', {
      timeZone: 'Europe/Zurich', weekday: 'long', day: 'numeric', month: 'long'
    }).format(new Date(next.date + 'T12:00:00Z'));
    return 'ouvre ' + prefix + ' à ' + formatTime(next.opens);
  }
  function information(now, config) {
    const closure = closureOn(now.date, config.closures);
    const closedText = 'Fermé' + (closure && closure.reason ? ' · ' + closure.reason : '');
    if (!config.valid) return closure ? { state: 'closed', label: closedText, today: names[now.weekday] + ' · fermé' } : { state: 'unknown', label: 'Horaires à confirmer', today: 'Horaires du jour à confirmer' };
    const hours = config.schedule.get(weekdays[now.weekday]);
    const yesterdayDate = addDays(now.date, -1);
    const yesterday = config.schedule.get(weekdays[weekday(yesterdayDate)]);
    let closes = '';
    if (!closure) {
      if (!hours.closed && now.minute >= hours.opens && (hours.closes < hours.opens || now.minute < hours.closes)) closes = hours.closing;
      else if (!closureOn(yesterdayDate, config.closures) && !yesterday.closed && yesterday.closes < yesterday.opens && now.minute < yesterday.closes) closes = yesterday.closing;
    }
    const today = names[now.weekday] + ' · ' + (closure || hours.closed ? 'fermé' : formatTime(hours.opening) + ' – ' + formatTime(hours.closing) + (hours.closes < hours.opens ? ' (le lendemain)' : ''));
    if (closes) return { state: 'open', label: 'Ouvert maintenant · jusqu’à ' + formatTime(closes), today };
    const next = nextOpening(now, config);
    return { state: 'closed', label: closedText + (next ? ' · ' + openingLabel(next, now.date) : ''), today };
  }
  function update() {
    const now = swissNow();
    const info = information(now, settings());
    document.querySelectorAll('[data-opening-status]').forEach(element => {
      element.dataset.state = info.state;
      element.textContent = info.label;
    });
    document.querySelectorAll('[data-today-hours]').forEach(element => { element.textContent = info.today; });
    document.querySelectorAll('table.horaires tr').forEach(row => {
      const today = row.dataset.weekday ? row.dataset.weekday === weekdays[now.weekday] : row.cells[0] && row.cells[0].textContent.trim().toLowerCase() === names[now.weekday].toLowerCase();
      row.classList.toggle('is-today', Boolean(today));
      if (today) row.setAttribute('aria-current', 'date');
      else row.removeAttribute('aria-current');
    });
  }
  document.addEventListener('otennis:restaurant-ready', event => { restaurant = event.detail; update(); });
  document.addEventListener('visibilitychange', update);
  window.addEventListener('pageshow', update);
  window.setInterval(update, 30000);
  update();
})();
