// O'Tennis - Restaurant Buvette chez Kryste
// Menu mobile, contacts et animations au defilement

document.addEventListener('DOMContentLoaded', function () {
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.main-nav');

  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      const ouvert = nav.classList.toggle('ouvert');
      toggle.setAttribute('aria-expanded', ouvert);
    });

    nav.querySelectorAll('a').forEach(function (lien) {
      lien.addEventListener('click', function () {
        nav.classList.remove('ouvert');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  const anneeEl = document.getElementById('annee-courante');
  if (anneeEl) {
    anneeEl.textContent = new Date().getFullYear();
  }

  const photoTerrasse = document.getElementById('photo-terrasse');
  if (photoTerrasse) {
    photoTerrasse.addEventListener('error', function () {
      this.removeAttribute('src');
      this.alt = 'Photo du lieu à venir';
      this.classList.add('photo-manquante');
    }, { once: true });
  }

  // Email reconstruit en JS pour limiter le scraping automatise par les bots
  document.querySelectorAll('[data-email-user]').forEach(function (el) {
    const adresse = el.getAttribute('data-email-user') + '@' + el.getAttribute('data-email-domaine');
    el.href = 'mailto:' + adresse;
    el.textContent = adresse;
  });

  // Le contenu reste visible sans animation ou sans IntersectionObserver.
  if (!window.IntersectionObserver || !window.matchMedia) return;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const revealed = new WeakSet();
  let scrollObserver;
  const scrollTargets = [
    '.presentation-texte', '.presentation-image',
    'section:not(#presentation) .section-soustitre',
    'section:not(#presentation) .section-titre',
    '#menu > .container > p:not(.section-soustitre)',
    '#menu > .container > div:not(.categorie-menu)',
    '.menu-nav', '.categorie-menu', '.contact-grille > div', '.footer-col'
  ].join(', ');

  function prepareScrollAnimations() {
    if (scrollObserver) scrollObserver.disconnect();
    if (reducedMotion.matches) return;
    scrollObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        revealed.add(entry.target);
        if (!entry.target.contains(document.activeElement)) {
          entry.target.classList.add('scroll-reveal');
        }
        scrollObserver.unobserve(entry.target);
      });
    }, { threshold: 0, rootMargin: '0px 0px -32px 0px' });
    document.querySelectorAll(scrollTargets).forEach(function (element) {
      if (!revealed.has(element)) scrollObserver.observe(element);
    });
  }

  document.addEventListener('animationend', function (event) {
    if (event.animationName === 'scroll-reveal') event.target.classList.remove('scroll-reveal');
  });
  // Le gestionnaire remplace les blocs de la carte apres leur chargement.
  document.addEventListener('otennis:content-ready', prepareScrollAnimations);
  reducedMotion.addEventListener('change', function () {
    document.querySelectorAll('.scroll-reveal').forEach(function (element) {
      element.classList.remove('scroll-reveal');
    });
    prepareScrollAnimations();
  });
  prepareScrollAnimations();
});
