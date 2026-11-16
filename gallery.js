// Restaurant gallery: safe editable content and an optional native photo viewer.
(function () {
  'use strict';
  const base = new URL('.', document.currentScript ? document.currentScript.src : document.baseURI);
  const text = value => typeof value === 'string' ? value : '';
  function node(tag, className, value) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (value !== undefined) element.textContent = value;
    return element;
  }
  function imageURL(value) {
    try {
      const path = decodeURIComponent(text(value)).replace(/^\//, '');
      if (!/^image\/[a-zA-Z0-9_./ -]+\.(?:png|jpe?g|webp|avif)$/i.test(path) || path.includes('..')) return '';
      return new URL(path, base).href;
    } catch (_) { return ''; }
  }

  async function initialize() {
    const section = document.getElementById('galerie');
    const grid = document.getElementById('gallery-grid');
    if (!section || !grid) return;
    let entries = [];
    let dialog, largePhoto, photoTitle, photoPrice, photoCount, photoError, previous, next;
    let current, opener;
    const available = () => entries.filter(entry => !entry.unavailable);

    function showPhoto(entry) {
      const photos = available();
      current = entry;
      largePhoto.hidden = false;
      photoError.hidden = true;
      largePhoto.src = entry.src;
      largePhoto.alt = entry.alt;
      photoTitle.textContent = entry.caption;
      photoPrice.textContent = entry.price;
      photoPrice.hidden = !entry.price;
      photoCount.textContent = 'Photo ' + (photos.indexOf(entry) + 1) + ' sur ' + photos.length;
      previous.disabled = next.disabled = photos.length < 2;
    }
    function step(direction) {
      const photos = available();
      if (photos.length) showPhoto(photos[(photos.indexOf(current) + direction + photos.length) % photos.length]);
    }
    function createViewer() {
      if (dialog) return true;
      const candidate = node('dialog', 'gallery-lightbox');
      if (typeof candidate.showModal !== 'function') return false;
      dialog = candidate;
      dialog.setAttribute('aria-labelledby', 'gallery-view-title');
      dialog.setAttribute('aria-describedby', 'gallery-view-count');
      const content = node('div', 'gallery-lightbox-content');
      const toolbar = node('div', 'gallery-lightbox-toolbar');
      photoCount = node('p', 'gallery-view-count');
      photoCount.id = 'gallery-view-count';
      photoCount.setAttribute('aria-live', 'polite');
      const close = node('button', 'gallery-view-close', 'Fermer ×');
      close.type = 'button';
      close.setAttribute('aria-label', 'Fermer la photo agrandie');
      close.addEventListener('click', () => dialog.close());
      toolbar.append(photoCount, close);
      const figure = node('figure', 'gallery-view-figure');
      largePhoto = node('img', 'gallery-view-photo');
      largePhoto.addEventListener('error', () => {
        largePhoto.hidden = true;
        photoError.hidden = false;
      });
      photoError = node('p', 'gallery-view-error', 'Cette photo ne peut pas être chargée. Vous pouvez consulter les autres photos.');
      photoError.hidden = true;
      photoError.setAttribute('role', 'status');
      const caption = node('figcaption');
      photoTitle = node('h3');
      photoTitle.id = 'gallery-view-title';
      photoPrice = node('p', 'gallery-view-price');
      caption.append(photoTitle, photoPrice);
      figure.append(largePhoto, photoError, caption);
      const controls = node('div', 'gallery-view-controls');
      previous = node('button', '', '← Précédente');
      next = node('button', '', 'Suivante →');
      previous.type = next.type = 'button';
      previous.addEventListener('click', () => step(-1));
      next.addEventListener('click', () => step(1));
      controls.append(previous, next);
      content.append(toolbar, figure, controls);
      dialog.append(content);
      dialog.addEventListener('keydown', event => {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault();
          step(event.key === 'ArrowLeft' ? -1 : 1);
        }
        if (event.key === 'Escape') { event.preventDefault(); dialog.close(); }
      });
      dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
      dialog.addEventListener('close', () => {
        document.body.classList.remove('gallery-viewing');
        if (opener && opener.isConnected) opener.focus({ preventScroll: true });
      });
      document.body.append(dialog);
      return true;
    }
    function photoCard(entry) {
      const figure = node('figure', 'gallery-card');
      const link = node('a', 'gallery-photo-link');
      link.href = entry.src;
      link.setAttribute('aria-label', 'Agrandir la photo : ' + entry.caption);
      const photo = node('img');
      photo.src = entry.src;
      photo.alt = entry.alt;
      photo.loading = 'lazy';
      photo.decoding = 'async';
      photo.width = 800;
      photo.height = 600;
      photo.addEventListener('error', () => {
        entry.unavailable = true;
        figure.remove();
        if (!available().length) section.hidden = true;
        if (dialog && dialog.open) {
          if (available().length) showPhoto(available().includes(current) ? current : available()[0]);
          else dialog.close();
        }
      }, { once: true });
      link.append(photo, node('span', 'gallery-enlarge', 'Agrandir ↗'));
      link.addEventListener('click', event => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        if (!createViewer()) return;
        showPhoto(entry);
        opener = link;
        try {
          dialog.showModal();
          document.body.classList.add('gallery-viewing');
          event.preventDefault();
        } catch (_) { /* The image link remains usable if modal dialogs are unavailable. */ }
      });
      const caption = node('figcaption');
      caption.append(node('h3', '', entry.caption));
      if (entry.price) caption.append(node('p', 'gallery-card-price', entry.price));
      figure.append(link, caption);
      return figure;
    }

    let status = 'fallback';
    try {
      const response = await fetch(new URL('data/gallery.json', base), { cache: 'no-cache', credentials: 'omit' });
      if (!response.ok) throw new Error('Gallery unavailable');
      const data = await response.json();
      if (!data || !Array.isArray(data.items)) throw new Error('Invalid gallery');
      entries = data.items.flatMap(item => {
        if (!item) return [];
        const src = imageURL(item.image);
        if (!src) return [];
        const caption = text(item.caption).trim() || text(item.alt).trim() || 'Photo du restaurant';
        return [{ src, caption, alt: text(item.alt).trim() || caption, price: text(item.price).trim() }];
      });
      const fragment = document.createDocumentFragment();
      entries.forEach(entry => fragment.append(photoCard(entry)));
      grid.classList.add('gallery-grid');
      grid.replaceChildren(fragment);
      section.hidden = !entries.length;
      status = entries.length ? 'ready' : 'empty';
    } catch (_) { /* Keep the readable HTML photos when editable content cannot load. */ }
    document.dispatchEvent(new CustomEvent('otennis:gallery-ready', { detail: { status } }));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
