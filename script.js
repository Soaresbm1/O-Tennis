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
});
