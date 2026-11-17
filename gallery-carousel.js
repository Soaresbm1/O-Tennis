// Native horizontal photo scrolling with optional keyboard and button controls.
(function () {
  'use strict';
  let carousel = null;

  function create(grid) {
    const controls = document.createElement('div');
    controls.className = 'gallery-carousel-controls';
    controls.setAttribute('role', 'group');
    controls.setAttribute('aria-label', 'Navigation des photos');
    function button(className, label, symbol) {
      const element = document.createElement('button');
      element.className = className;
      element.type = 'button';
      element.textContent = symbol;
      element.setAttribute('aria-label', label);
      element.setAttribute('aria-controls', grid.id);
      return element;
    }
    const previous = button('gallery-carousel-prev', 'Photo précédente', '←');
    const next = button('gallery-carousel-next', 'Photo suivante', '→');
    const status = document.createElement('p');
    status.className = 'gallery-carousel-status';
    status.id = grid.id + '-carousel-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.setAttribute('aria-atomic', 'true');
    controls.append(previous, status, next);
    grid.after(controls);
    grid.setAttribute('role', 'region');
    grid.setAttribute('aria-roledescription', 'carrousel');
    grid.setAttribute('aria-label', 'Photos du restaurant');
    grid.setAttribute('aria-describedby', status.id);

    function dimensions() {
      const cards = [...grid.children].filter(element => element.classList.contains('gallery-card') && !element.hidden);
      const left = Math.max(0, grid.scrollLeft);
      const width = grid.clientWidth;
      const origin = grid.getBoundingClientRect().left;
      const positions = cards.map(card => {
        const rect = card.getBoundingClientRect();
        return { left: rect.left - origin + left, right: rect.right - origin + left };
      });
      return { cards, positions, left, width, maximum: Math.max(0, grid.scrollWidth - width) };
    }
    function update() {
      const data = dimensions();
      const overflow = data.width > 0 && data.maximum > 1 && data.cards.length > 1;
      controls.hidden = !overflow;
      grid.tabIndex = data.cards.length ? 0 : -1;
      previous.disabled = !overflow || data.left <= 1;
      next.disabled = !overflow || data.left >= data.maximum - 1;
      if (data.width > 0 && data.left > data.maximum + 1) grid.scrollLeft = data.maximum;
      const visible = data.positions.map((position, index) => ({ ...position, index })).filter(position => position.right > data.left + 1 && position.left < data.left + data.width - 1);
      let label = data.cards.length + ' photos';
      if (!data.cards.length) label = 'Aucune photo';
      else if (data.cards.length === 1) label = 'Photo 1 sur 1';
      else if (visible.length) {
        const first = visible[0].index + 1;
        const last = visible[visible.length - 1].index + 1;
        label = first === last ? 'Photo ' + first + ' sur ' + data.cards.length : 'Photos ' + first + ' à ' + last + ' sur ' + data.cards.length;
      }
      if (status.textContent !== label) status.textContent = label;
    }
    function move(direction) {
      const data = dimensions();
      if (!data.cards.length || data.maximum <= 1) return;
      let target;
      if (direction === 'start') target = 0;
      else if (direction === 'end') target = data.maximum;
      else if (direction > 0) target = (data.positions.find(position => position.left > data.left + 1) || { left: data.maximum }).left;
      else target = ([...data.positions].reverse().find(position => position.left < data.left - 1) || { left: 0 }).left;
      target = Math.max(0, Math.min(data.maximum, target));
      const reduced = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (typeof grid.scrollTo === 'function') grid.scrollTo({ left: target, behavior: reduced ? 'auto' : 'smooth' });
      else grid.scrollLeft = target;
      update();
    }
    function keyboard(event) {
      if (event.target !== grid || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
      const actions = { ArrowLeft: -1, ArrowRight: 1, Home: 'start', End: 'end' };
      if (!(event.key in actions) || dimensions().maximum <= 1) return;
      event.preventDefault();
      move(actions[event.key]);
    }
    previous.addEventListener('click', () => move(-1));
    next.addEventListener('click', () => move(1));
    grid.addEventListener('keydown', keyboard);
    grid.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    const resize = typeof window.ResizeObserver === 'function' ? new window.ResizeObserver(update) : null;
    if (resize) resize.observe(grid);
    const children = typeof window.MutationObserver === 'function' ? new window.MutationObserver(update) : null;
    if (children) children.observe(grid, { childList: true });
    update();
    return {
      grid, update,
      destroy() {
        grid.removeEventListener('keydown', keyboard);
        grid.removeEventListener('scroll', update);
        window.removeEventListener('resize', update);
        if (resize) resize.disconnect();
        if (children) children.disconnect();
        controls.remove();
      }
    };
  }

  function initialize() {
    const grid = document.querySelector('#galerie #gallery-grid');
    if (carousel && carousel.grid === grid) { carousel.update(); return; }
    if (carousel) carousel.destroy();
    carousel = grid ? create(grid) : null;
  }
  document.addEventListener('otennis:gallery-ready', initialize);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
