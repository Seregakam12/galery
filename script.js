(function () {
  "use strict";

  const S = window.SITE || {};
  const W = (window.WORKS || []).slice();
  const $ = (id) => document.getElementById(id);

  const STATUS = {
    available: "В наличии",
    sold: "Продано",
    collection: "В частной коллекции"
  };

  /* ---------- УТИЛИТЫ ---------- */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  function paras(v) {
    const arr = Array.isArray(v) ? v : [v];
    return arr.filter(Boolean).map((p) => `<p>${esc(p)}</p>`).join("");
  }

  function plural(n, forms) {
    const a = Math.abs(n) % 100, b = a % 10;
    if (a > 10 && a < 20) return forms[2];
    if (b > 1 && b < 5) return forms[1];
    if (b === 1) return forms[0];
    return forms[2];
  }

  function meta(w) {
    return [w.technique, w.size, w.year, w.edition].filter(Boolean).join(" · ");
  }

  function hideIfEmpty(wrapId, value) {
    const empty = !value || (Array.isArray(value) && value.length === 0);
    if (empty && $(wrapId)) $(wrapId).style.display = "none";
    return !empty;
  }

  /* ---------- ТЕКСТЫ ---------- */
  function fillTexts() {
    const name = S.name || "Гравюры";
    document.title = name + " — Гравюры";
    $("brand").textContent = name;
    $("heroName").textContent = name;
    $("tagline").textContent = S.tagline || "";
    $("footName").textContent = name;
    $("year").textContent = new Date().getFullYear();

    $("worksCount").textContent = W.length + " " + plural(W.length, ["работа", "работы", "работ"]);

    if (S.portrait) {
      $("portrait").src = S.portrait;
      $("portrait").alt = "Портрет: " + name;
    } else {
      $("portrait").style.display = "none";
    }

    $("aboutText").innerHTML = paras(S.about);

    if (hideIfEmpty("techniqueWrap", S.technique)) $("technique").innerHTML = paras(S.technique);

    if (hideIfEmpty("exhibitionsWrap", S.exhibitions)) {
      $("exhibitions").innerHTML = S.exhibitions
        .map((e) => `<li><span class="yr">${esc(e.year)}</span><span>${esc(e.text)}</span></li>`)
        .join("");
    }

    if (hideIfEmpty("purchaseWrap", S.purchase)) $("purchase").innerHTML = paras(S.purchase);

    const email = $("email");
    if (S.email) {
      email.textContent = S.email;
      email.href = "mailto:" + S.email;
    } else {
      email.style.display = "none";
    }

    $("socials").innerHTML = (S.socials || [])
      .map((s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a>`)
      .join("");
  }

  /* ---------- ГАЛЕРЕЯ ---------- */
  function renderGallery() {
    const g = $("gallery");
    g.innerHTML = "";
    W.forEach((w, i) => {
      const fig = document.createElement("figure");
      fig.className = "card";
      fig.tabIndex = 0;
      fig.innerHTML = `
        <div class="img"><img loading="lazy" decoding="async" alt="${esc(w.title)}"></div>
        <figcaption><span class="t">${esc(w.title)}</span><span class="y">${esc(w.year || "")}</span></figcaption>`;
      const img = fig.querySelector("img");
      img.onload = () => img.classList.add("loaded");
      img.onerror = () => img.classList.add("loaded");
      img.src = w.image;
      fig.addEventListener("click", () => openLb(W, i));
      fig.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openLb(W, i); }
      });
      g.appendChild(fig);
    });
  }

  /* ---------- КАТАЛОГ ---------- */
  let currentFilter = "all";
  let currentList = W;

  function renderFilters() {
    const techs = [...new Set(W.map((w) => w.technique).filter(Boolean))];
    const items = [{ key: "all", label: "Все" }]
      .concat(techs.map((t) => ({ key: "t:" + t, label: t })))
      .concat(W.some((w) => w.status === "available") ? [{ key: "available", label: "В наличии" }] : []);

    const box = $("filters");
    box.innerHTML = "";
    items.forEach((it) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = it.label;
      if (it.key === currentFilter) b.classList.add("active");
      b.addEventListener("click", () => {
        currentFilter = it.key;
        box.querySelectorAll("button").forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
        renderCatalog();
      });
      box.appendChild(b);
    });
  }

  function filtered() {
    if (currentFilter === "all") return W;
    if (currentFilter === "available") return W.filter((w) => w.status === "available");
    const t = currentFilter.slice(2);
    return W.filter((w) => w.technique === t);
  }

  function renderCatalog() {
    currentList = filtered();
    const box = $("catalogList");
    box.innerHTML = "";

    if (!currentList.length) {
      box.innerHTML = `<div class="empty">Нет работ</div>`;
      return;
    }

    currentList.forEach((w, i) => {
      const row = document.createElement("div");
      row.className = "row";
      row.tabIndex = 0;
      const st = w.status || "collection";
      const price = st === "available" && w.price ? `<span class="price">${esc(w.price)}</span>` : "";
      row.innerHTML = `
        <span class="n">${String(i + 1).padStart(2, "0")}</span>
        <img loading="lazy" decoding="async" src="${esc(w.image)}" alt="${esc(w.title)}">
        <div>
          <div class="title">${esc(w.title)}</div>
          <div class="sub">${esc(meta(w))}</div>
        </div>
        <div class="status ${esc(st)}">${esc(STATUS[st] || "")}${price}</div>`;
      row.addEventListener("click", () => openLb(currentList, i));
      row.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openLb(currentList, i); }
      });
      box.appendChild(row);
    });
  }

  /* ---------- ПРОСМОТР ---------- */
  const lb = { el: $("lightbox"), list: [], i: 0, token: 0, lastFocus: null };

  function openLb(list, i) {
    if (!list.length) return;
    lb.list = list;
    lb.i = i;
    lb.lastFocus = document.activeElement;
    lb.el.classList.add("open");
    lb.el.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    showLb();
    $("lbClose").focus({ preventScroll: true });
  }

  function closeLb() {
    lb.el.classList.remove("open");
    lb.el.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    if (lb.lastFocus && lb.lastFocus.focus) lb.lastFocus.focus({ preventScroll: true });
  }

  function showLb() {
    const w = lb.list[lb.i];
    if (!w) return;
    const img = $("lbImg");
    const token = ++lb.token;

    img.classList.add("fade");
    const pre = new Image();
    pre.onload = pre.onerror = () => {
      if (token !== lb.token) return;
      img.src = w.image;
      img.alt = w.title || "";
      img.classList.remove("fade");
    };
    pre.src = w.image;

    const st = STATUS[w.status] ? " · " + STATUS[w.status] : "";
    const price = w.status === "available" && w.price ? " · " + w.price : "";
    $("lbTitle").textContent = w.title || "";
    $("lbMeta").textContent = meta(w) + st + price;
    $("lbDesc").textContent = w.description || "";
    $("lbCounter").textContent = lb.list.length > 1 ? `${lb.i + 1} / ${lb.list.length}` : "";

    const multi = lb.list.length > 1;
    $("lbPrev").style.display = multi ? "" : "none";
    $("lbNext").style.display = multi ? "" : "none";

    [-1, 1].forEach((d) => {
      const n = lb.list[(lb.i + d + lb.list.length) % lb.list.length];
      if (n) new Image().src = n.image;
    });
  }

  function step(d) {
    if (lb.list.length < 2) return;
    lb.i = (lb.i + d + lb.list.length) % lb.list.length;
    showLb();
  }

  function initLb() {
    $("lbClose").addEventListener("click", closeLb);
    $("lbPrev").addEventListener("click", (e) => { e.stopPropagation(); step(-1); });
    $("lbNext").addEventListener("click", (e) => { e.stopPropagation(); step(1); });
    lb.el.addEventListener("click", (e) => {
      if (e.target === lb.el || e.target.classList.contains("lb-fig")) closeLb();
    });
    document.addEventListener("keydown", (e) => {
      if (!lb.el.classList.contains("open")) return;
      if (e.key === "Escape") closeLb();
      else if (e.key === "ArrowLeft") step(-1);
      else if (e.key === "ArrowRight") step(1);
    });

    let sx = 0, sy = 0, tracking = false;
    lb.el.addEventListener("touchstart", (e) => {
      if (e.touches.length !== 1) return;
      tracking = true;
      sx = e.touches[0].clientX;
      sy = e.touches[0].clientY;
    }, { passive: true });
    lb.el.addEventListener("touchend", (e) => {
      if (!tracking) return;
      tracking = false;
      const t = e.changedTouches[0];
      const dx = t.clientX - sx, dy = t.clientY - sy;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1);
      else if (dy > 90 && Math.abs(dy) > Math.abs(dx) * 1.5) closeLb();
    }, { passive: true });
  }

  /* ---------- ИНТРО: процарапывание ---------- */
  function initIntro() {
    const box = $("intro"), cv = $("scratch"), hint = $("introHint"), skip = $("introSkip");
    if (!box || !cv) { document.body.classList.remove("lock"); return; }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let seen = false;
    try { seen = sessionStorage.getItem("introSeen") === "1"; } catch (e) {}

    if (seen || reduce) {
      box.remove();
      document.body.classList.remove("lock");
      return;
    }

    const ctx = cv.getContext("2d");
    const CELL = 24;
    let w = 0, h = 0, dpr = 1, brush = 50;
    let cols = 0, rows = 0, grid = null, cleared = 0, total = 1;
    let drawing = false, last = null, moves = 0, done = false;

    function setup() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = cv.clientWidth;
      h = cv.clientHeight;
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      brush = Math.max(36, Math.min(w, h) * 0.09);

      cols = Math.ceil(w / CELL);
      rows = Math.ceil(h / CELL);
      grid = new Uint8Array(cols * rows);
      total = cols * rows;
      cleared = 0;

      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, w, h);

      // фактура доски — тонкая штриховка
      ctx.strokeStyle = "rgba(255,255,255,.035)";
      ctx.lineWidth = 1;
      for (let x = -h; x < w; x += 7) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + h, h);
        ctx.stroke();
      }

      // имя автора
      const name = (S.name || "").toUpperCase();
      if (name) {
        const size = Math.max(28, Math.min(w * 0.08, 84));
        ctx.font = `300 ${size}px "Cormorant Garamond", Georgia, serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "rgba(255,255,255,.92)";
        if ("letterSpacing" in ctx) ctx.letterSpacing = size * 0.08 + "px";
        ctx.fillText(name, w / 2, h / 2);
        if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
      }
    }

    function mark(x, y, r) {
      const c0 = Math.max(0, Math.floor((x - r) / CELL));
      const c1 = Math.min(cols - 1, Math.floor((x + r) / CELL));
      const r0 = Math.max(0, Math.floor((y - r) / CELL));
      const r1 = Math.min(rows - 1, Math.floor((y + r) / CELL));
      for (let ry = r0; ry <= r1; ry++) {
        for (let cx = c0; cx <= c1; cx++) {
          const mx = cx * CELL + CELL / 2, my = ry * CELL + CELL / 2;
          if ((mx - x) * (mx - x) + (my - y) * (my - y) <= r * r) {
            const k = ry * cols + cx;
            if (!grid[k]) { grid[k] = 1; cleared++; }
          }
        }
      }
    }

    function scratch(a, b) {
      const dist = Math.hypot(b.x - a.x, b.y - a.y);
      const width = brush * (0.75 + Math.min(dist, 40) / 160);

      ctx.globalCompositeOperation = "destination-out";
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      ctx.strokeStyle = "rgba(0,0,0,1)";
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();

      // тонкие «штрихи резца» по краям
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = "rgba(0,0,0,.8)";
      for (let k = 0; k < 3; k++) {
        const off = (width / 2) + 4 + Math.random() * 10;
        const nx = -(b.y - a.y) / (dist || 1), ny = (b.x - a.x) / (dist || 1);
        const sgn = k % 2 ? 1 : -1;
        ctx.beginPath();
        ctx.moveTo(a.x + nx * off * sgn, a.y + ny * off * sgn);
        ctx.lineTo(b.x + nx * off * sgn, b.y + ny * off * sgn);
        ctx.stroke();
      }

      const steps = Math.max(1, Math.ceil(dist / 6));
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        mark(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, width / 2);
      }

      moves++;
      if (moves === 1 && hint) hint.classList.add("off");
      if (cleared / total > 0.5) finish();
    }

    function pos(e) {
      const r = cv.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }

    function finish() {
      if (done) return;
      done = true;
      try { sessionStorage.setItem("introSeen", "1"); } catch (e) {}
      box.classList.add("hide");
      document.body.classList.remove("lock");
      window.removeEventListener("resize", onResize);
      setTimeout(() => box.remove(), 1300);
    }

    function onResize() {
      if (moves === 0) setup();
    }

    cv.addEventListener("pointerdown", (e) => {
      if (done) return;
      drawing = true;
      last = pos(e);
      try { cv.setPointerCapture(e.pointerId); } catch (err) {}
      scratch(last, { x: last.x + 0.1, y: last.y + 0.1 });
    });

    cv.addEventListener("pointermove", (e) => {
      if (done) return;
      const p = pos(e);
      if (drawing || e.pointerType === "mouse") {
        if (last) scratch(last, p);
        last = p;
      }
    });

    const stop = (e) => {
      drawing = false;
      if (!e || e.pointerType !== "mouse") last = null;
    };
    cv.addEventListener("pointerup", stop);
    cv.addEventListener("pointercancel", stop);
    cv.addEventListener("pointerleave", () => { if (!drawing) last = null; });

    skip.addEventListener("click", finish);
    document.addEventListener("keydown", (e) => {
      if (!done && (e.key === "Enter" || e.key === "Escape")) finish();
    });

    window.addEventListener("resize", onResize);
    setup();
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => { if (moves === 0 && !done) setup(); });
    }
  }

  /* ---------- СТАРТ ---------- */
  function init() {
    fillTexts();
    renderGallery();
    renderFilters();
    renderCatalog();
    initLb();
    initIntro();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
