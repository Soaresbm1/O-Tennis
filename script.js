// O'Tennis - Restaurant Buvette chez Kryste
// Menu mobile + annee automatique dans le footer

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
      this.src = '';
      this.alt = 'Photo du lieu à venir';
      this.classList.add('photo-manquante');
    });
  }

  // Email reconstruit en JS pour limiter le scraping automatise par les bots
  document.querySelectorAll('[data-email-user]').forEach(function (el) {
    const adresse = el.getAttribute('data-email-user') + '@' + el.getAttribute('data-email-domaine');
    el.href = 'mailto:' + adresse;
    el.textContent = adresse;
  });
});
