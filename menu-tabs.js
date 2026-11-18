// Enhance the complete, readable menu with keyboard-accessible category tabs.
(function () {
  'use strict';
  let active = null;

  function hashTarget() {
    try { return document.getElementById(decodeURIComponent(window.location.hash.slice(1))); }
    catch (_) { return null; }
  }

  function indexForTarget(target) {
    return active ? active.entries.findIndex(entry => target && (entry.panel === target || entry.panel.contains(target))) : -1;
  }

  function select(index, options) {
    if (!active || !active.entries[index]) return;
    const settings = options || {};
    active.entries.forEach((entry, i) => {
      const selected = i === index;
      entry.tab.setAttribute('aria-selected', String(selected));
      entry.tab.tabIndex = selected ? 0 : -1;
      entry.panel.hidden = !selected;
    });
    active.index = index;
    const entry = active.entries[index];
    // Sur petit ecran le rail d'onglets defile : garde l'onglet actif visible.
    const rail = active.nav;
    if (rail.scrollWidth > rail.clientWidth && typeof rail.scrollTo === 'function') {
      rail.scrollTo({ left: Math.max(0, entry.tab.offsetLeft - (rail.clientWidth - entry.tab.offsetWidth) / 2), behavior: 'auto' });
    }
    if (settings.focus) entry.tab.focus();
    if (settings.updateHash && hashTarget() !== entry.panel) {
      const hash = '#' + encodeURIComponent(entry.panel.id);
      try { window.history.pushState(null, '', hash); }
      catch (_) { window.location.hash = hash; }
    }
    document.dispatchEvent(new CustomEvent('otennis:menu-tab-change', { detail: { categoryId: entry.panel.id } }));
  }

  function route(scroll) {
    if (!active) return;
    const target = hashTarget();
    const index = indexForTarget(target);
    select(index < 0 ? 0 : index);
    if (scroll && index >= 0 && typeof target.scrollIntoView === 'function') {
      // The shared stylesheet disables smooth scrolling for reduced-motion users.
      target.scrollIntoView({ block: 'start', behavior: 'auto' });
    }
  }

  function enhance() {
    if (document.body.dataset.page !== 'menu') return;
    const nav = document.querySelector('#menu .menu-nav');
    if (!nav) { active = null; return; }
    if (active && active.nav === nav) { route(false); return; }
    const seen = new Set();
    const entries = [];
    nav.querySelectorAll('a[href^="#"]').forEach(tab => {
      let panel;
      try { panel = document.getElementById(decodeURIComponent(tab.hash.slice(1))); }
      catch (_) { return; }
      if (!panel || !panel.matches('#menu .categorie-menu') || seen.has(panel)) return;
      seen.add(panel);
      entries.push({ tab, panel });
    });
    if (!entries.length) { active = null; return; }
    active = { nav, entries, index: 0 };
    nav.setAttribute('role', 'tablist');
    nav.setAttribute('aria-label', 'Catégories de la carte');
    entries.forEach((entry, index) => {
      let id = 'category-tab-' + entry.panel.id;
      while (document.getElementById(id) && document.getElementById(id) !== entry.tab) id += '-2';
      entry.tab.id = id;
      entry.tab.setAttribute('role', 'tab');
      entry.tab.setAttribute('aria-controls', entry.panel.id);
      entry.panel.setAttribute('role', 'tabpanel');
      entry.panel.setAttribute('aria-labelledby', id);
      entry.panel.tabIndex = 0;
      entry.tab.addEventListener('click', event => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        select(index, { updateHash: true });
      });
      entry.tab.addEventListener('keydown', event => {
        let next;
        if (event.key === 'ArrowRight') next = (index + 1) % entries.length;
        else if (event.key === 'ArrowLeft') next = (index - 1 + entries.length) % entries.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = entries.length - 1;
        else return;
        event.preventDefault();
        select(next, { focus: true, updateHash: true });
      });
    });
    // Replacing the full menu changes its height; reveal the target before scrolling.
    route(true);
  }

  document.addEventListener('otennis:content-ready', enhance);
  window.addEventListener('hashchange', () => route(true));
  window.addEventListener('popstate', () => route(false));
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', enhance, { once: true });
  else enhance();
})();
