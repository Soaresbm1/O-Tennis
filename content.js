// Shared public content, saved in GitHub by the authenticated management service.
// No credentials or write permissions are needed by visitors.
(function () {
  'use strict';
  const siteBase = new URL('.', document.currentScript ? document.currentScript.src : document.baseURI);

  function text(value) { return typeof value === 'string' ? value : ''; }
  function list(value) { return Array.isArray(value) ? value : []; }
  function node(tag, className, value) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (value !== undefined) element.textContent = text(value);
    return element;
  }
  function setText(selector, value) {
    if (typeof value !== 'string') return;
    document.querySelectorAll(selector).forEach(element => { element.textContent = value; });
  }
  function imagePath(value) {
    const path = text(value).replace(/^\//, '');
    if (!/^image\/[a-zA-Z0-9_./% -]+\.(?:png|jpe?g|webp|avif)$/i.test(path) || path.includes('..')) return '';
    // Resolve relative to the site root, so project.github.io/repository also works.
    return new URL(path, siteBase).href;
  }
  function image(value, alt, className) {
    const src = imagePath(value);
    if (!src) return null;
    const element = node('img', className);
    element.src = src;
    element.alt = text(alt);
    element.loading = 'lazy';
    element.addEventListener('error', () => { element.hidden = true; }, { once: true });
    return element;
  }
  function link(label, href) {
    const element = node('a', '', label);
    element.href = href;
    return element;
  }
  function socialLink(key, label, shortLabel, value) {
    try {
      const url = new URL(text(value));
      if (url.protocol !== 'https:') return null;
      const social = link(key === 'instagram' ? '' : shortLabel, url.href);
      social.setAttribute('aria-label', label + ' (nouvel onglet)');
      social.title = label;
      social.target = '_blank';
      social.rel = 'noopener noreferrer';
      if (key === 'instagram') {
        social.className = 'instagram-link';
        const icon = node('img');
        icon.src = new URL('image/instagram.svg', siteBase).href;
        icon.alt = '';
        icon.width = icon.height = 22;
        social.append(icon);
      }
      return social;
    } catch (_) { return null; }
  }
  function time(value) { return /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : ''; }
  function phone(value) {
    const digits = text(value).replace(/[^+\d]/g, '');
    if (/^0\d{9}$/.test(digits)) return '+41' + digits.slice(1);
    return /^\+?\d{7,15}$/.test(digits) ? digits : '';
  }
  function note(value) { return node('p', 'categorie-note', value); }

  function renderRestaurant(data) {
    if (!data || !text(data.name) || !Array.isArray(data.hours)) throw new Error('Invalid restaurant content');
    setText('.logo-texte h1, .footer-logo strong', data.name);
    setText('.logo-texte p', data.tagline);
    document.querySelectorAll('.footer-logo > div').forEach(element => {
      element.replaceChildren(node('strong', '', data.name), node('br'), document.createTextNode(text(data.tagline)));
    });
    const logo = imagePath(data.logo);
    if (logo) document.querySelectorAll('.logo-bloc img, .footer-logo img').forEach(element => {
      element.src = logo;
      element.alt = 'Logo ' + data.name;
    });
    const address = [text(data.street), [text(data.postalCode), text(data.city)].filter(Boolean).join(' ') + (data.country ? ', ' + data.country : '')];
    function addressContent() {
      return [document.createTextNode(address[0]), node('br'), document.createTextNode(address[1])];
    }
    const info = document.querySelectorAll('#contact .ligne-info > div');
    if (info.length === 4) {
      info[0].replaceChildren(node('strong', '', 'Adresse'), node('br'), ...addressContent());
      info[1].replaceChildren(node('strong', '', 'Téléphone'), node('br'), link(data.phone, 'tel:' + phone(data.phone)));
      info[2].replaceChildren(node('strong', '', 'Email'), node('br'), link(data.email, 'mailto:' + text(data.email).replace(/[\r\n?]/g, '')));
      info[3].replaceChildren(node('strong', '', 'Réservation'), node('br'), document.createTextNode(text(data.reservation)));
    }
    document.querySelectorAll('[data-call]').forEach(element => {
      const number = phone(data.phone);
      element.href = number ? 'tel:' + number : new URL('index.html#contact', siteBase).href;
      element.setAttribute('aria-label', 'Appeler le restaurant au ' + text(data.phone));
    });
    setText('[data-phone-number]', data.phone);
    setText('[data-group-reservation]', data.groupReservation);
    setText('[data-preorder-note]', data.preorderNote);
    document.querySelectorAll('[data-group-reservation], [data-preorder-note]').forEach(element => {
      element.hidden = !element.textContent.trim();
    });
    const directions = new URL('https://www.google.com/maps/dir/');
    directions.searchParams.set('api', '1');
    directions.searchParams.set('destination', text(data.mapAddress) || address.join(', '));
    document.querySelectorAll('[data-directions]').forEach(element => { element.href = directions.href; });
    document.querySelectorAll('.contact-reseaux').forEach(element => {
      const instagram = socialLink('instagram', 'Instagram', '', data.instagram);
      element.replaceChildren(...(instagram ? [instagram] : []));
      element.hidden = !instagram;
    });
    document.querySelectorAll('.site-footer .footer-col').forEach(column => {
      const heading = column.querySelector('h4');
      if (!heading) return;
      if (heading.textContent === 'Adresse') {
        const paragraph = node('p');
        paragraph.append(...addressContent());
        column.replaceChildren(heading, paragraph);
      }
      if (heading.textContent === 'Contact') {
        const telephone = node('p');
        telephone.append(link(data.phone, 'tel:' + phone(data.phone)));
        const email = node('p');
        email.append(link(data.email, 'mailto:' + text(data.email).replace(/[\r\n?]/g, '')));
        column.replaceChildren(heading, telephone, email);
      }
      if (heading.textContent === 'Réseaux sociaux') {
        const socials = node('div', 'footer-reseaux');
        for (const [key, label, shortLabel] of [['facebook', 'Facebook', 'f'], ['instagram', 'Instagram', 'i']]) {
          const social = socialLink(key, label, shortLabel, data[key]);
          if (social) socials.append(social);
        }
        column.replaceChildren(heading, socials);
        column.hidden = socials.children.length === 0;
      }
    });
    const table = document.querySelector('table.horaires');
    if (table && data.hours.length) {
      const body = node('tbody');
      data.hours.forEach(day => {
        const row = node('tr');
        row.dataset.weekday = text(day.schemaDay);
        const opening = time(day.opens), closing = time(day.closes);
        row.append(node('td', '', day.day), node('td', '', day.closed ? 'Fermé' : opening && closing ? opening.replace(':', 'h') + ' - ' + closing.replace(':', 'h') : 'Nous contacter'));
        body.append(row);
      });
      table.replaceChildren(body);
    }
    const map = document.querySelector('.carte-embed iframe');
    if (map && text(data.mapAddress)) {
      const url = 'https://www.google.com/maps?q=' + encodeURIComponent(data.mapAddress) + '&output=embed';
      if (map.src !== url) map.src = url;
      map.title = 'Carte — ' + data.name;
    }
    const schema = document.querySelector('script[type="application/ld+json"]');
    if (schema) {
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      schema.textContent = JSON.stringify({
        '@context': 'https://schema.org', '@type': 'Restaurant', name: data.name + ' — ' + text(data.tagline),
        image: imagePath('/image/terrasse.jpg'), url: new URL('index.html', siteBase).href,
        telephone: phone(data.phone), servesCuisine: 'Suisse', priceRange: 'CHF',
        address: {'@type': 'PostalAddress', streetAddress: data.street, postalCode: data.postalCode, addressLocality: data.city, addressCountry: 'CH'},
        menu: new URL('menu.html', siteBase).href,
        openingHoursSpecification: data.hours.filter(day => !day.closed && time(day.opens) && time(day.closes) && days.includes(day.schemaDay)).map(day => ({
          '@type': 'OpeningHoursSpecification', dayOfWeek: day.schemaDay, opens: day.opens, closes: day.closes
        }))
      });
    }
    const year = document.getElementById('annee-courante');
    if (year && year.parentElement) {
      const manager = year.parentElement.querySelector('.manager-link');
      year.parentElement.replaceChildren(document.createTextNode('© '), year, document.createTextNode(' ' + data.name + ' — ' + text(data.tagline) + '. Tous droits réservés.'));
      if (manager) year.parentElement.append(manager);
    }
    const pageLabel = document.body.dataset.page === 'menu' ? 'Menu — ' : document.body.dataset.page === 'not-found' ? 'Page introuvable — ' : '';
    document.title = pageLabel + data.name + ' — ' + text(data.tagline) + ' | ' + text(data.city);
    document.dispatchEvent(new CustomEvent('otennis:restaurant-ready', { detail: data }));
  }

  function renderHome(data) {
    if (!data || !text(data.heroTitle)) throw new Error('Invalid home content');
    for (const [selector, key] of [
      ['.hero h2', 'heroTitle'], ['.hero .accroche', 'heroText'], ['.hero [data-menu-button]', 'heroButton'],
      ['.presentation-texte .section-soustitre', 'welcomeLabel'], ['.presentation-texte h2', 'presentationTitle'],
      ['.presentation-texte > p:not(.section-soustitre)', 'presentationText'],
      ['#menu .section-soustitre', 'menuLabel'], ['#menu .section-titre', 'menuTitle'],
      ['#menu .container > p:not(.section-soustitre)', 'menuText'], ['#menu .btn', 'menuButton'],
      ['#contact .section-soustitre', 'contactLabel'], ['#contact .section-titre', 'contactTitle']
    ]) setText(selector, data[key]);
    const highlights = document.querySelector('.atouts');
    if (highlights && Array.isArray(data.highlights)) {
      highlights.replaceChildren(...data.highlights.map(item => {
        const element = node('div', 'atout');
        element.append(node('span', 'emoji', item.emoji), document.createTextNode(text(item.text)));
        return element;
      }));
    }
    const terrace = document.getElementById('photo-terrasse');
    const src = imagePath(data.photo);
    if (terrace && src) {
      terrace.src = src;
      terrace.alt = text(data.photoAlt);
      document.querySelectorAll('meta[property="og:image"], meta[name="twitter:image"]').forEach(meta => { meta.content = src; });
      const schema = document.querySelector('script[type="application/ld+json"]');
      if (schema) {
        const value = JSON.parse(schema.textContent);
        value.image = src;
        schema.textContent = JSON.stringify(value);
      }
    }
    let announcement = document.getElementById('restaurant-announcement');
    if (text(data.announcement)) {
      if (!announcement) {
        announcement = node('aside', 'restaurant-announcement');
        announcement.id = 'restaurant-announcement';
        document.querySelector('.hero').after(announcement);
      }
      announcement.replaceChildren(node('p', 'container', data.announcement));
    } else if (announcement) announcement.remove();
  }

  function renderItem(item, layout) {
    const element = node(layout === 'list' ? 'li' : 'div', layout === 'list' ? 'menu-list-item' : 'plat');
    const photo = image(item.image, item.name, layout === 'list' ? 'article-photo' : 'plat-photo');
    if (photo) element.append(photo);
    const content = layout === 'list' ? node('div', 'menu-list-content') : element;
    const heading = node(layout === 'list' ? 'div' : 'div', 'plat-entete');
    heading.append(node(layout === 'list' ? 'span' : 'h4', 'menu-item-name', item.name));
    if (text(item.price)) heading.append(node('strong', 'plat-prix', item.price));
    content.append(heading);
    if (list(item.portions).length) {
      const portions = node('div', 'plat-tailles');
      item.portions.forEach(portion => {
        const line = node('span');
        line.append(document.createTextNode(text(portion.label) + ' : '), node('strong', '', portion.price));
        portions.append(line);
      });
      content.append(portions);
    }
    if (text(item.description)) content.append(node('p', 'plat-description', item.description));
    if (layout === 'list') element.append(content);
    return element;
  }

  function renderMenu(data) {
    if (!data || !Array.isArray(data.categories) || !data.categories.length) throw new Error('Invalid menu content');
    const container = document.querySelector('body[data-page="menu"] #menu .container');
    if (!container) return;
    const fragment = document.createDocumentFragment();
    fragment.append(node('p', 'section-soustitre', data.label), node('h2', 'section-titre', data.title));
    if (text(data.notice)) {
      const notice = note(data.notice);
      notice.classList.add('menu-notice');
      fragment.append(notice);
    }
    const nav = node('nav', 'menu-nav');
    nav.setAttribute('aria-label', 'Catégories de la carte');
    const seen = new Set();
    data.categories.forEach((category, i) => {
      let id = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(category.id) ? category.id : 'categorie-' + (i + 1);
      while (seen.has(id)) id += '-2';
      seen.add(id);
      nav.append(link(text(category.navLabel) || category.title, '#' + id));
      const section = node('div', 'categorie-menu');
      section.id = id;
      section.append(node('h3', '', category.title));
      list(category.notes).forEach(value => section.append(note(value)));
      list(category.groups).forEach(group => {
        if (text(group.title)) section.append(node('h4', 'menu-group-title', group.title));
        const layout = group.layout === 'list' ? 'list' : 'cards';
        const items = node(layout === 'list' ? 'ul' : 'div', layout === 'list' ? 'liste-simple' : 'plats');
        list(group.items).forEach(item => items.append(renderItem(item, layout)));
        section.append(items);
        list(group.notes).forEach(value => section.append(note(value)));
      });
      fragment.append(section);
    });
    // Render everything before replacing the fallback, so a malformed edit cannot leave half a menu.
    fragment.insertBefore(nav, fragment.querySelector('.categorie-menu'));
    container.replaceChildren(fragment);
    if (window.location.hash) {
      let target;
      try { target = document.getElementById(decodeURIComponent(window.location.hash.slice(1))); } catch (_) { return; }
      if (target && container.contains(target)) target.scrollIntoView({ block: 'start' });
    }
  }

  let dailyMenus = [];
  let dailyMenuDay = '';

  function swissDay() {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Zurich', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date());
    const value = type => parts.find(part => part.type === type).value;
    return value('year') + '-' + value('month') + '-' + value('day');
  }

  function renderDailyMenu() {
    const section = document.getElementById('menu-du-jour');
    if (!section) return;
    dailyMenuDay = swissDay();
    // Matching a real Swiss calendar day also rejects timestamps and invalid dates.
    const menu = dailyMenus.find(item => item && item.date === dailyMenuDay && text(item.main).trim() && text(item.price).trim());
    if (!menu) {
      section.hidden = true;
      section.replaceChildren();
      return;
    }

    const container = node('div', 'container');
    const card = node('div', 'daily-menu-card');
    const content = node('div', 'daily-menu-content');
    const heading = node('div', 'daily-menu-heading');
    const titleBlock = node('div');
    titleBlock.append(node('p', 'daily-menu-eyebrow', 'Aujourd’hui à table'));
    const title = node('h2', '', 'Menu du jour');
    title.id = 'daily-menu-title';
    const date = node('time', 'daily-menu-date', new Intl.DateTimeFormat('fr-CH', {
      timeZone: 'Europe/Zurich', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    }).format(new Date(menu.date + 'T12:00:00Z')));
    date.dateTime = menu.date;
    titleBlock.append(title, date);
    const price = node('p', 'daily-menu-price', menu.price);
    heading.append(titleBlock, price);
    content.append(heading);

    const courses = node('dl', 'daily-menu-courses');
    for (const [key, label] of [['starter', 'Entrée'], ['main', 'Plat principal'], ['dessert', 'Dessert']]) {
      if (!text(menu[key]).trim()) continue;
      const course = node('div', 'daily-menu-course');
      course.append(node('dt', '', label), node('dd', '', menu[key]));
      courses.append(course);
    }
    content.append(courses);
    card.append(content);
    const photo = image(menu.photo, 'Menu du jour : ' + menu.main, 'daily-menu-photo');
    if (photo) card.append(photo);
    container.append(card);
    section.replaceChildren(container);
    section.hidden = false;
  }

  function setDailyMenus(data) {
    dailyMenus = list(data && data.menus);
    renderDailyMenu();
  }

  async function load(name) {
    const response = await fetch(new URL('data/' + name + '.json', siteBase), { cache: 'no-cache', credentials: 'omit' });
    if (!response.ok) throw new Error('Content unavailable');
    return response.json();
  }

  async function refresh() {
    const page = document.body.dataset.page;
    const requests = [['restaurant', renderRestaurant]];
    if (page === 'home' || page === 'menu') {
      requests.push([page, page === 'menu' ? renderMenu : renderHome], ['daily-menu', setDailyMenus]);
    }
    const results = await Promise.allSettled(requests.map(([name]) => load(name)));
    for (let i = 0; i < results.length; i++) {
      try {
        if (results[i].status !== 'fulfilled') throw results[i].reason;
        requests[i][1](results[i].value);
      } catch (_) {
        // Keep the original content if an individual data file cannot be read.
        document.documentElement.dataset.contentStatus = 'fallback';
      }
    }
    if (page === 'home' || page === 'menu') {
      // Recheck sleeping/background tabs too; visitors' own timezone is irrelevant.
      const checkDay = () => { if (dailyMenuDay !== swissDay()) renderDailyMenu(); };
      window.setInterval(checkDay, 30000);
      document.addEventListener('visibilitychange', checkDay);
      window.addEventListener('pageshow', checkDay);
    }
    document.dispatchEvent(new CustomEvent('otennis:content-ready'));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', refresh, { once: true });
  else refresh();
})();
