(() => {
  'use strict';

  const works = Array.isArray(window.WORKS) ? window.WORKS : [];
  const $ = (id) => document.getElementById(id);

  /* ---------- Год и почта ---------- */
  document.querySelectorAll('[data-current-year]').forEach((el) => {
    el.textContent = new Date().getFullYear();
  });
  document.querySelectorAll('[data-email]').forEach((a) => {
    const mail = a.dataset.user + '@' + a.dataset.domain;
    a.href = 'mailto:' + mail;
    a.textContent = mail;
  });

  const metaText = (w) => [w.year, w.technique, w.size].filter(Boolean).join(' · ');

  /* ---------- Галерея ---------- */
  const gallery = $('gallery');
  if (!works.length) $('gallery-empty').hidden = false;

  works.forEach((w, i) => {
    const fig = document.createElement('figure');
    fig.className = 'card';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'card__btn';
    btn.setAttribute('aria-label', 'Открыть: ' + (w.title || 'работа ' + (i + 1)));

    const img = document.createElement('img');
    img.src = w.thumb || w.src;
    img.alt = w.title || '';
    img.loading = 'lazy';
    img.decoding = 'async';

    btn.append(img);
    btn.addEventListener('click', () => openViewer(i));
    fig.append(btn);

    const m = metaText(w);
    if (w.title || m) {
      const cap = document.createElement('figcaption');
      if (w.title) {
        const t = document.createElement('div');
        t.className = 'card__title';
        t.textContent = w.title;
        cap.append(t);
      }
      if (m) {
        const p = document.createElement('div');
        p.className = 'card__meta';
        p.textContent = m;
        cap.append(p);
      }
      fig.append(cap);
    }

    gallery.append(fig);
  });

  /* ---------- Просмотрщик ---------- */
  const viewer = $('viewer');
  const stage = $('viewer-stage');
  const vImg = $('viewer-img');
  const vTitle = $('viewer-title');
  const vMeta = $('viewer-meta');
  const vCounter = $('viewer-counter');
  const btnPrev = $('viewer-prev');
  const btnNext = $('viewer-next');
  const btnClose = $('viewer-close');
  const btnZoomIn = $('zoom-in');
  const btnZoomOut = $('zoom-out');
  const btnZoomReset = $('zoom-reset');

  const MIN_SCALE = 1;
  const MAX_SCALE = 5;
  const STEP = 1.5;
  const TAP_ZOOM = 2.5;

  let index = 0;
  let scale = 1;
  let tx = 0;
  let ty = 0;
  let lastFocus = null;
  let historyPushed = false;

  function clampPan() {
    if (scale <= 1) { tx = 0; ty = 0; return; }
    const w = vImg.offsetWidth * scale;
    const h = vImg.offsetHeight * scale;
    const maxX = Math.max(0, (w - stage.clientWidth) / 2);
    const maxY = Math.max(0, (h - stage.clientHeight) / 2);
    tx = Math.min(maxX, Math.max(-maxX, tx));
    ty = Math.min(maxY, Math.max(-maxY, ty));
  }

  function apply() {
    clampPan();
    vImg.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
    stage.classList.toggle('is-zoomed', scale > 1);
    btnZoomReset.textContent = Math.round(scale * 100) + '%';
  }

  // Координаты точки относительно центра сцены
  function stagePoint(clientX, clientY) {
    const r = stage.getBoundingClientRect();
    return [clientX - r.left - r.width / 2, clientY - r.top - r.height / 2];
  }

  // Масштаб с сохранением точки (cx, cy) под курсором/пальцами
  function zoomTo(newScale, cx = 0, cy = 0) {
    newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, newScale));
    const k = newScale / scale;
    tx = cx - (cx - tx) * k;
    ty = cy - (cy - ty) * k;
    scale = newScale;
    apply();
  }

  function resetZoom() {
    scale = 1; tx = 0; ty = 0;
    apply();
  }

  function preload(i) {
    if (works.length < 2) return;
    const w = works[(i + works.length) % works.length];
    const im = new Image();
    im.src = w.src;
  }

  function show(i) {
    if (!works.length) return;
    index = (i + works.length) % works.length;
    const w = works[index];

    resetZoom();
    vImg.src = w.src;
    vImg.alt = w.title || '';
    vTitle.textContent = w.title || '';
    vMeta.textContent = metaText(w);
    vCounter.textContent = works.length > 1 ? `${index + 1} / ${works.length}` : '';

    const multi = works.length > 1;
    btnPrev.hidden = !multi;
    btnNext.hidden = !multi;

    preload(index + 1);
    preload(index - 1);
  }

  function openViewer(i) {
    lastFocus = document.activeElement;
    viewer.hidden = false;
    document.body.classList.add('no-scroll');
    show(i);
    btnClose.focus();

    // Кнопка «Назад» на телефоне закрывает просмотр, а не уходит со страницы
    history.pushState({ viewer: true }, '');
    historyPushed = true;
  }

  function closeViewer(fromPopState = false) {
    if (viewer.hidden) return;
    viewer.hidden = true;
    document.body.classList.remove('no-scroll');
    resetZoom();
    vImg.removeAttribute('src');
    if (lastFocus && lastFocus.focus) lastFocus.focus();

    if (historyPushed && !fromPopState) {
      historyPushed = false;
      history.back();
    } else {
      historyPushed = false;
    }
  }

  window.addEventListener('popstate', () => {
    if (!viewer.hidden) {
      historyPushed = false;
      closeViewer(true);
    }
  });

  /* ---------- Кнопки ---------- */
  btnPrev.addEventListener('click', () => show(index - 1));
  btnNext.addEventListener('click', () => show(index + 1));
  btnClose.addEventListener('click', () => closeViewer());
  btnZoomIn.addEventListener('click', () => zoomTo(scale * STEP));
  btnZoomOut.addEventListener('click', () => zoomTo(scale / STEP));
  btnZoomReset.addEventListener('click', resetZoom);

  /* ---------- Клавиатура ---------- */
  function trapFocus(e) {
    const items = [...viewer.querySelectorAll('button')]
      .filter((b) => !b.hidden && b.offsetParent !== null);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  }

  document.addEventListener('keydown', (e) => {
    if (viewer.hidden) return;
    const PAN = 80;

    switch (e.key) {
      case 'Escape':
        closeViewer(); break;
      case 'ArrowLeft':
        if (scale > 1) { tx += PAN; apply(); } else show(index - 1);
        break;
      case 'ArrowRight':
        if (scale > 1) { tx -= PAN; apply(); } else show(index + 1);
        break;
      case 'ArrowUp':
        if (scale > 1) { ty += PAN; apply(); }
        break;
      case 'ArrowDown':
        if (scale > 1) { ty -= PAN; apply(); }
        break;
      case '+':
      case '=':
        zoomTo(scale * STEP); break;
      case '-':
      case '_':
        zoomTo(scale / STEP); break;
      case '0':
        resetZoom(); break;
      case 'Tab':
        trapFocus(e); return;
      default:
        return;
    }
    e.preventDefault();
  });

  /* ---------- Колесо мыши / тачпад ---------- */
  stage.addEventListener('wheel', (e) => {
    e.preventDefault();
    const [cx, cy] = stagePoint(e.clientX, e.clientY);
    zoomTo(scale * Math.exp(-e.deltaY * 0.0015), cx, cy);
  }, { passive: false });

  /* ---------- Мышь и сенсор: перетаскивание, щипок, свайп, тап ---------- */
  const pointers = new Map();
  let start = null;   // { x, y, tx, ty, time }
  let pinch = null;   // { dist, scale }
  let moved = false;

  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  function handleTap(x, y) {
    const r = vImg.getBoundingClientRect();
    const onImage = x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;

    if (scale > 1) {
      resetZoom();
    } else if (onImage) {
      const [cx, cy] = stagePoint(x, y);
      zoomTo(TAP_ZOOM, cx, cy);
    } else {
      closeViewer();
    }
  }

  stage.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    stage.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    stage.classList.add('is-dragging');

    if (pointers.size === 1) {
      start = { x: e.clientX, y: e.clientY, tx, ty, time: Date.now() };
      moved = false;
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = { dist: distance(a, b) || 1, scale };
      start = null;
      moved = true;
    }
  });

  stage.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.size === 2 && pinch) {
      const [a, b] = [...pointers.values()];
      const [cx, cy] = stagePoint((a.x + b.x) / 2, (a.y + b.y) / 2);
      zoomTo(pinch.scale * distance(a, b) / pinch.dist, cx, cy);
      return;
    }

    if (pointers.size === 1 && start) {
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      if (Math.abs(dx) + Math.abs(dy) > 6) moved = true;

      if (scale > 1) {
        tx = start.tx + dx;
        ty = start.ty + dy;
        apply();
      } else if (works.length > 1) {
        // Картинка «едет» за пальцем при свайпе
        vImg.style.transform = `translateX(${dx}px)`;
      }
    }
  });

  function endPointer(e) {
    if (!pointers.has(e.pointerId)) return;
    const wasStart = start;
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;

    // После щипка остался один палец — продолжаем перетаскивание им
    if (pointers.size === 1) {
      const p = [...pointers.values()][0];
      start = { x: p.x, y: p.y, tx, ty, time: Date.now() };
      return;
    }

    if (pointers.size === 0) {
      stage.classList.remove('is-dragging');

      if (wasStart) {
        const dx = e.clientX - wasStart.x;
        const dy = e.clientY - wasStart.y;
        const quick = Date.now() - wasStart.time < 350;

        if (!moved && quick && e.type === 'pointerup') {
          handleTap(e.clientX, e.clientY);
        } else if (scale === 1) {
          if (works.length > 1 && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) {
            show(index + (dx < 0 ? 1 : -1));
          } else {
            apply();
          }
        }
      }
      start = null;
    }
  }

  stage.addEventListener('pointerup', endPointer);
  stage.addEventListener('pointercancel', endPointer);

  window.addEventListener('resize', () => {
    if (!viewer.hidden) apply();
  });
})();
