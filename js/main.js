/* Home page: work grid, filters, hero, case study. Shared code lives in common.js, content in data.js. */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/* ============ SMALL HELPERS ============ */
function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
/* Titles are written as "Client: subtitle". Split at render time only. */
function splitTitle(title) {
  const i = title.indexOf(': ');
  return i === -1 ? { client: title, sub: '' } : { client: title.slice(0, i), sub: title.slice(i + 2) };
}
const isVertical = (p) => /9:16/.test(p.application || '');
const loc = (p, key) => (currentLang === 'fr' && p[key + '_fr']) ? p[key + '_fr'] : p[key];
const tagLabel = (tag) => t('tag.' + tag) === 'tag.' + tag ? tag : t('tag.' + tag);
const posterOf = (p) => p.preview ? `media/${p.preview}.jpg` : '';

/* ============ WORK META (range and counts come from the data) ============ */
function renderWorkMeta() {
  const years = PROJECTS.map(p => parseInt(p.year, 10)).filter(Boolean);
  const range = `${Math.min(...years)} ${t('work.to')} ${Math.max(...years)}`;
  $('#workRange').textContent = range;
  $('#workCount').textContent = `${PROJECTS.length} ${t('work.projects')}`;
}

/* ============ RENDER PROJECT GRID ============ */
const gridEl = $('#project-grid');
const tileEls = [];

function tileCaption(p) {
  const { client, sub } = splitTitle(p.title);
  const app = loc(p, 'application');
  const tags = p.tags.map(tagLabel).join(', ');
  return `
    <div class="caption">
      <div class="cap-top">
        <span class="cap-client">${esc(client)}</span>
        <span class="cap-year num">${esc(p.year)}</span>
      </div>
      ${sub ? `<span class="cap-sub">${esc(sub)}</span>` : ''}
      <span class="cap-meta">${esc(app)}<span class="cap-tags">${esc(tags)}</span></span>
    </div>`;
}

PROJECTS.forEach((p, i) => {
  const tile = document.createElement('a');
  tile.className = 'project-tile';
  tile.href = `#project=${p.slug}`;
  tile.dataset.index = i;
  tile.dataset.cursor = 'view';
  if (isVertical(p)) tile.dataset.vertical = '';
  tile.setAttribute('aria-label', p.title);

  const isVideo = p.hero && p.hero.endsWith('.mp4');
  const pos = p.heroPosition ? ` style="object-position:${esc(p.heroPosition)}"` : '';
  let mediaHtml = '';
  if (p.preview) {
    mediaHtml += `<img class="tile-poster" src="${posterOf(p)}" alt="" width="720" height="450" loading="lazy" decoding="async"${pos}>`;
  }
  if (isVideo) {
    const src = p.preview ? `media/${p.preview}.mp4` : `media/${p.hero}`;
    mediaHtml += `<video class="tile-video" data-src="${esc(src)}" loop muted playsinline preload="none" aria-hidden="true" tabindex="-1"${pos}${p.preview || !p.heroStart ? '' : ` data-start="${p.heroStart}"`}></video>`;
  }

  tile.innerHTML = `
    <div class="media">
      ${mediaHtml}
      <span class="scrub" aria-hidden="true"></span>
      <div class="meta-panel" aria-hidden="true">
        <span class="mp-role"></span>
        <span class="mp-tools"></span>
      </div>
      <svg class="tile-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M7 17L17 7M17 7H8M17 7v9"/></svg>
    </div>
    <div class="caption-wrap"></div>`;
  if (p.color) tile.style.setProperty('--pc', p.color);
  gridEl.appendChild(tile);
  tileEls.push(tile);
});

function renderTileText() {
  tileEls.forEach(tile => {
    const p = PROJECTS[+tile.dataset.index];
    $('.caption-wrap', tile).innerHTML = tileCaption(p);
    $('.mp-role', tile).textContent = loc(p, 'role');
    $('.mp-tools', tile).textContent = p.tools;
  });
}

/* ============ LAYOUT SLOTS (varied sizes, composed after filtering) ============ */
const PAIRS = [[5, 7], [7, 5], [6, 6]];
function ratioFor(span, vertical) {
  if (vertical) return '4 / 5';
  return { 12: '21 / 9', 8: '16 / 10', 7: '16 / 10', 6: '16 / 10', 5: '4 / 3', 4: '4 / 5' }[span] || '16 / 10';
}
function layoutTiles() {
  const vis = tileEls.filter(t_ => !t_.classList.contains('hidden'));
  const q = vis.slice();
  let pairIdx = 0;
  const place = (tile, span, col) => {
    const p = PROJECTS[+tile.dataset.index];
    tile.style.setProperty('--span', span);
    tile.style.setProperty('--ar', ratioFor(span, isVertical(p)));
    tile.style.setProperty('--col', col);
  };
  while (q.length) {
    const a = q.shift();
    const av = isVertical(PROJECTS[+a.dataset.index]);
    if (!q.length) {
      place(a, av ? 5 : 12, 0);
      break;
    }
    const b = q.shift();
    const bv = isVertical(PROJECTS[+b.dataset.index]);
    if (av && !bv) { place(a, 4, 0); place(b, 8, 1); }
    else if (!av && bv) { place(a, 8, 0); place(b, 4, 1); }
    else if (av && bv) { place(a, 6, 0); place(b, 6, 1); }
    else { const pr = PAIRS[pairIdx++ % PAIRS.length]; place(a, pr[0], 0); place(b, pr[1], 1); }
  }
}

/* ============ FILTERS ============ */
const filtersEl = $('#filters');
const allTags = [...new Set(PROJECTS.flatMap(p => p.tags))];
let activeTag = 'all';
const filterLine = document.createElement('span');
filterLine.className = 'filter-line';
filterLine.setAttribute('aria-hidden', 'true');

function countFor(tag) {
  return tag === 'all' ? PROJECTS.length : PROJECTS.filter(p => p.tags.includes(tag)).length;
}
function renderFilters() {
  filtersEl.innerHTML = '';
  ['all', ...allTags].forEach(tag => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'filter-tag';
    btn.dataset.tag = tag;
    btn.setAttribute('aria-pressed', tag === activeTag ? 'true' : 'false');
    btn.innerHTML = `<span class="f-label">${esc(tag === 'all' ? t('filter.all') : tagLabel(tag))}</span><span class="f-count num">${countFor(tag)}</span>`;
    filtersEl.appendChild(btn);
  });
  filtersEl.appendChild(filterLine);
  moveFilterLine(false);
}
function moveFilterLine() {
  const btn = $(`.filter-tag[data-tag="${activeTag}"]`, filtersEl);
  if (!btn) return;
  filterLine.style.transform = `translate(${btn.offsetLeft}px, ${btn.offsetTop + btn.offsetHeight - 2}px) scaleX(${btn.offsetWidth})`;
}
window.addEventListener('resize', moveFilterLine);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(moveFilterLine);

function applyFilter(tag) {
  tileEls.forEach(tile => {
    const p = PROJECTS[+tile.dataset.index];
    tile.classList.toggle('hidden', !(tag === 'all' || p.tags.includes(tag)));
  });
  layoutTiles();
}
function setFilter(tag) {
  if (tag === activeTag) return;
  activeTag = tag;
  $$('.filter-tag', filtersEl).forEach(b => b.setAttribute('aria-pressed', b.dataset.tag === tag ? 'true' : 'false'));
  moveFilterLine();
  const run = () => applyFilter(tag);
  if (motionOK() && document.startViewTransition) {
    const shown = tileEls.filter(x => !x.classList.contains('hidden'));
    shown.forEach(x => { x.style.viewTransitionName = 'tile-' + x.dataset.index; });
    const vt = document.startViewTransition(run);
    vt.finished.finally(() => tileEls.forEach(x => { x.style.viewTransitionName = ''; }));
  } else {
    run();
  }
}
filtersEl.addEventListener('click', (e) => {
  const btn = e.target.closest('.filter-tag');
  if (btn) setFilter(btn.dataset.tag);
});

/* ============ TILE REVEAL (clip wipe, once) ============ */
const revealIO = 'IntersectionObserver' in window
  ? new IntersectionObserver((entries) => {
      entries.forEach(en => {
        if (en.isIntersecting) { en.target.classList.add('in'); revealIO.unobserve(en.target); }
      });
    }, { threshold: 0.15 })
  : null;
tileEls.forEach(tile => { if (revealIO) revealIO.observe(tile); else tile.classList.add('in'); });

/* ============ VIDEO DISCIPLINE: lazy src, play when visible, at most 3 at once ============ */
const MAX_PLAYING = 3;
const tileVideos = $$('.tile-video[data-src]');
const visibleVids = new Set();
const vidCenterDistance = (v) => { const r = v.getBoundingClientRect(); return Math.abs((r.top + r.bottom) / 2 - innerHeight / 2); };
const canPlayTiles = () => autoplayOK() && !document.hidden && !csIsOpen();

function syncPlayback() {
  const list = [...visibleVids].sort((a, b) => vidCenterDistance(a) - vidCenterDistance(b));
  let n = 0;
  list.forEach(v => {
    if (v.dataset.scrub) return;
    if (canPlayTiles() && n < MAX_PLAYING) { n++; v.play().catch(() => {}); }
    else v.pause();
  });
  tileVideos.forEach(v => { if (!visibleVids.has(v)) v.pause(); });
}
function loadTileVideo(v) {
  if (v.getAttribute('src')) return;
  v.src = v.dataset.src;
  if (v.dataset.start) v.addEventListener('loadedmetadata', () => { v.currentTime = parseFloat(v.dataset.start); }, { once: true });
}
tileVideos.forEach(v => {
  v.addEventListener('playing', () => v.classList.add('is-playing'));
});
if (autoplayOK()) {
  const tileObserver = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          const v = entry.target;
          if (entry.isIntersecting) { loadTileVideo(v); visibleVids.add(v); }
          else visibleVids.delete(v);
        });
        syncPlayback();
      }, { threshold: 0.25, rootMargin: '100px' })
    : null;
  tileVideos.forEach(v => {
    if (tileObserver) tileObserver.observe(v);
    else { loadTileVideo(v); visibleVids.add(v); }
  });
  window.addEventListener('scroll', (() => { let t_ = 0; return () => { if (t_) return; t_ = setTimeout(() => { t_ = 0; syncPlayback(); }, 150); }; })(), { passive: true });
  document.addEventListener('visibilitychange', syncPlayback);
}
/* reduced motion and save-data: posters only, the tile still opens the case study */

/* ============ TILE SCRUB (pointer only): x position drives currentTime ============ */
function wireTile(tile) {
  const v = $('video', tile);
  const bar = $('.scrub', tile);
  if (!v) return;
  let raf = 0, tx = 0, active = false;
  tile.addEventListener('pointerenter', (e) => {
    if (e.pointerType !== 'mouse' || !motionOK() || !v.getAttribute('src')) return;
    active = true;
    v.dataset.scrub = '1';
    v.pause();
  });
  tile.addEventListener('pointermove', (e) => {
    if (!active || !v.duration) return;
    const r = tile.getBoundingClientRect();
    tx = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    if (!raf) raf = requestAnimationFrame(() => {
      raf = 0;
      v.currentTime = tx * v.duration;
      bar.style.transform = `scaleX(${tx})`;
    });
  });
  tile.addEventListener('pointerleave', () => {
    if (!active) return;
    active = false;
    delete v.dataset.scrub;
    bar.style.transform = 'scaleX(0)';
    syncPlayback();
  });
}
tileEls.forEach(wireTile);

/* ============ HERO: headline split, playhead sweep, monitor ============ */
const rootEl = document.documentElement;
function splitChars(el) {
  const text = el.textContent;
  el.textContent = '';
  const full = document.createElement('span');
  full.className = 'sr-only';
  full.textContent = text;
  const vis = document.createElement('span');
  vis.setAttribute('aria-hidden', 'true');
  [...text].forEach(ch => {
    const s = document.createElement('span');
    s.className = 'char';
    s.textContent = ch;
    vis.appendChild(s);
  });
  el.append(full, vis);
}
let heroSeen = false;
try { heroSeen = sessionStorage.getItem('heroPlayed') === '1'; } catch (e) { /* ignore */ }
const heroAnimates = motionOK() && !heroSeen;

function armHero() {
  if (!heroAnimates) { rootEl.classList.add('no-anim', 'is-ready'); return; }
  rootEl.classList.add('hero-anim');
  $$('.hero-title .line > span:not(.sr-only)').forEach(splitChars);
  const W = innerWidth;
  $$('.hero-title .char').forEach(c => {
    const x = c.getBoundingClientRect().left;
    c.style.setProperty('--delay', Math.round((x / W) * 1100) + 'ms');
  });
  const firstPoster = new Promise(res => {
    const im = $('.m-poster');
    if (!im.src || im.complete) res(); else { im.addEventListener('load', res, { once: true }); im.addEventListener('error', res, { once: true }); }
  });
  Promise.race([
    Promise.all([document.fonts ? document.fonts.ready : Promise.resolve(), firstPoster]),
    new Promise(r => setTimeout(r, 900))
  ]).then(() => {
    rootEl.classList.add('is-ready');
    try { sessionStorage.setItem('heroPlayed', '1'); } catch (e) { /* ignore */ }
  });
}

const MONITOR_SLUGS = ['fortel', 'laodis', 'holovisio-step-files', 'samdoc'];
const monitor = {
  el: $('#monitor'),
  vids: $$('#monitor .m-vid'),
  poster: $('#monitor .m-poster'),
  tc: $('#monitorTc'),
  name: $('#monitorName'),
  list: MONITOR_SLUGS.map(s => PROJECTS.find(p => p.slug === s)).filter(p => p && p.preview),
  i: -1, cur: 0, timer: 0, visible: true, started: false
};
function monitorLabel(p) { return splitTitle(p.title).client; }
function monitorShow(p) {
  monitor.name.textContent = monitorLabel(p);
  monitor.el.setAttribute('href', `#project=${p.slug}`);
  monitor.el.dataset.slug = p.slug;
}
function monitorNext() {
  clearTimeout(monitor.timer);
  if (!monitor.started || document.hidden || !monitor.visible || csIsOpen()) return;
  monitor.i = (monitor.i + 1) % monitor.list.length;
  const p = monitor.list[monitor.i];
  const next = monitor.vids[monitor.cur ^ 1];
  const prev = monitor.vids[monitor.cur];
  monitor.cur ^= 1;
  next.src = `media/${p.preview}.mp4`;
  next.currentTime = 0;
  const onPlaying = () => {
    next.removeEventListener('playing', onPlaying);
    next.classList.add('on');
    prev.classList.remove('on');
    monitorShow(p);
    monitor.timer = setTimeout(monitorNext, 3600);
  };
  next.addEventListener('playing', onPlaying);
  next.play().catch(() => { monitor.timer = setTimeout(monitorNext, 3600); });
}
function fmtTc(s) {
  const m = Math.floor(s / 60);
  const r = s - m * 60;
  return `${m}:${r.toFixed(1).padStart(4, '0')}`;
}
function monitorTick() {
  const v = monitor.vids[monitor.cur];
  if (monitor.visible && v && !v.paused) monitor.tc.textContent = fmtTc(v.currentTime);
  requestAnimationFrame(monitorTick);
}
function initMonitor() {
  if (!monitor.list.length) { monitor.el.hidden = true; return; }
  const first = monitor.list[0];
  monitor.poster.src = `media/${first.preview}.jpg`;
  monitorShow(first);
  if (!autoplayOK()) return;            // reduced motion or save-data: one static poster
  monitor.started = true;
  requestAnimationFrame(monitorTick);
  const stop = () => { monitor.vids.forEach(v => v.pause()); clearTimeout(monitor.timer); };
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((es) => {
      monitor.visible = es[0].isIntersecting;
      if (monitor.visible) monitorNext(); else stop();
    }, { threshold: 0.2 }).observe(monitor.el);
  } else monitorNext();
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop(); else monitorNext();
  });
  monitor.stop = stop;
}
monitor.el.addEventListener('click', (e) => {
  e.preventDefault();
  const idx = PROJECTS.findIndex(p => p.slug === monitor.el.dataset.slug);
  if (idx > -1) openCase(idx, monitor.el);
});

/* ============ HERO COLOR MOTION: pause when idle, gentle pointer parallax ============ */
(function () {
  const hero = $('.hero');
  const fl = $('.floaters');
  if (!hero) return;
  let seen = true;
  const sync = () => hero.classList.toggle('mo-off', !seen || document.hidden);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((es) => { seen = es[0].isIntersecting; sync(); }, { threshold: 0 }).observe(hero);
  }
  document.addEventListener('visibilitychange', sync);
  if (!fl || !FINE.matches || !motionOK()) return;
  let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
  const step = () => {
    cx += (tx - cx) * 0.06; cy += (ty - cy) * 0.06;
    fl.style.setProperty('--px', cx.toFixed(3));
    fl.style.setProperty('--py', cy.toFixed(3));
    raf = (Math.abs(tx - cx) + Math.abs(ty - cy) > 0.002 && seen && !document.hidden) ? requestAnimationFrame(step) : 0;
  };
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || !seen) return;
    tx = (e.clientX / innerWidth - 0.5) * 2;
    ty = (e.clientY / innerHeight - 0.5) * 2;
    if (!raf) raf = requestAnimationFrame(step);
  }, { passive: true });
})();

/* ============ CASE STUDY (dialog) ============ */
const caseStudy = $('#caseStudy');
const csClose = $('#csClose');
const csScroll = $('#csScroll');
const csStage = $('#csStage');
const pageEl = $('#page');
let csIdx = -1, csOpener = null, csPushed = false, csPendingScroll = '';
const csIsOpen = () => caseStudy.classList.contains('open');

const ICON = {
  pause: '<svg class="i-main" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg><svg class="i-alt" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4l13 8-13 8z"/></svg>',
  sound: '<svg class="i-main" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4zM17 8a5 5 0 010 8"/><path d="M3 3l18 18"/></svg><svg class="i-alt" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4zM17 8a5 5 0 010 8"/></svg>'
};

function renderCaseStage(p) {
  const isVideo = p.hero && p.hero.endsWith('.mp4');
  const poster = p.preview ? ` poster="media/${p.preview}.jpg"` : '';
  if (!isVideo) {
    csStage.innerHTML = `<div class="cs-hero">${p.preview ? `<img src="media/${p.preview}.jpg" alt="${esc(p.title)}">` : ''}</div>`;
    return;
  }
  const auto = autoplayOK();
  csStage.innerHTML = `
    <div class="cs-hero"><video id="csHeroVideo" src="media/${esc(p.hero)}"${poster} ${auto ? 'autoplay ' : ''}loop muted playsinline preload="metadata" aria-label="${esc(p.title)}"></video></div>
    <div class="cs-controls">
      <button type="button" class="cs-ctl" id="csPlay" aria-pressed="${auto ? 'false' : 'true'}">${ICON.pause}</button>
      <button type="button" class="cs-ctl" id="csSound" aria-pressed="false">${ICON.sound}</button>
    </div>`;
  const v = $('#csHeroVideo');
  const pl = $('#csPlay'), snd = $('#csSound');
  pl.addEventListener('click', () => { if (v.paused) v.play().catch(() => {}); else v.pause(); });
  v.addEventListener('play', () => { pl.setAttribute('aria-pressed', 'false'); updateCsLabels(); });
  v.addEventListener('pause', () => { pl.setAttribute('aria-pressed', 'true'); updateCsLabels(); });
  snd.addEventListener('click', () => { v.muted = !v.muted; snd.setAttribute('aria-pressed', v.muted ? 'false' : 'true'); updateCsLabels(); });
  updateCsLabels();
}
function updateCsLabels() {
  const v = $('#csHeroVideo');
  if (!v) return;
  $('#csPlay').setAttribute('aria-label', v.paused ? t('cs.play') : t('cs.pause'));
  $('#csSound').setAttribute('aria-label', v.muted ? t('cs.mute') : t('cs.unmute'));
}

function renderCaseStills(p) {
  const items = p.stills.map((s, n) => {
    const isVid = s.endsWith('.mp4');
    const body = isVid
      ? `<video src="media/${esc(s)}" controls muted playsinline preload="metadata" aria-label="${esc(p.title)}, ${n + 1}"></video>`
      : `<img src="media/${esc(s)}" alt="${esc(p.title)}, ${n + 1}" loading="lazy" decoding="async">`;
    return `<figure class="cs-still">${body}</figure>`;
  });
  if (p.stillsLayout === 'tall') return `<div class="cs-row tall">${items.join('')}</div>`;
  // alternate: one full width, then a pair, then full width again
  let html = '', i = 0, full = true;
  while (i < items.length) {
    if (full || i === items.length - 1) { html += items[i]; i += 1; }
    else { html += `<div class="cs-row two">${items[i]}${items[i + 1]}</div>`; i += 2; }
    full = !full;
  }
  return html;
}

function renderCaseText(idx) {
  const p = PROJECTS[idx];
  const { client, sub } = splitTitle(p.title);
  $('.cs-client', caseStudy).textContent = client;
  $('.cs-sub', caseStudy).textContent = sub;
  $('#csDesc').textContent = loc(p, 'desc');
  $('#csCredits').innerHTML = `
    <div><dt>${t('cs.client')}</dt><dd>${esc(p.client)}</dd></div>
    <div><dt>${t('cs.role')}</dt><dd>${esc(loc(p, 'role'))}</dd></div>
    <div><dt>${t('cs.tools')}</dt><dd>${esc(p.tools)}</dd></div>
    <div><dt>${t('cs.year')}</dt><dd class="num">${esc(p.year)}</dd></div>`;
  const nextIdx = (idx + 1) % PROJECTS.length;
  const np = PROJECTS[nextIdx];
  const nextLink = $('#csNext');
  nextLink.href = `#project=${np.slug}`;
  nextLink.dataset.next = nextIdx;
  $('#csNextTitle').textContent = np.title.replace(': ', ', ');
  const th = $('#csNextThumb');
  if (np.preview) th.src = `media/${np.preview}.jpg`;
  updateCsLabels();
}
function renderCase(idx) {
  const p = PROJECTS[idx];
  renderCaseStage(p);
  $('#csMedia').innerHTML = renderCaseStills(p);
  renderCaseText(idx);
  csIdx = idx;
  if (p.color) caseStudy.style.setProperty('--pc', p.color); else caseStudy.style.removeProperty('--pc');
  csScroll.scrollTop = 0;
}

function csUnloadVideos() {
  $$('video', caseStudy).forEach(v => { v.pause(); v.removeAttribute('src'); v.load(); });
}
function pageOverlayOn() {
  caseStudy.removeAttribute('inert');
  caseStudy.classList.add('open');
  pageEl.setAttribute('inert', '');
  rootEl.classList.add('cs-lock');
}
function pageOverlayOff() {
  caseStudy.classList.remove('open');
  caseStudy.setAttribute('inert', '');
  pageEl.removeAttribute('inert');
  rootEl.classList.remove('cs-lock');
}

function openCase(idx, opener, opts = {}) {
  const p = PROJECTS[idx];
  if (!p) return;
  const wasOpen = csIsOpen();
  if (!wasOpen) csOpener = opener || document.activeElement;
  if (opts.fromHash) { /* url already points here */ }
  else if (wasOpen) history.replaceState({ cs: p.slug }, '', `#project=${p.slug}`);
  else { history.pushState({ cs: p.slug }, '', `#project=${p.slug}`); csPushed = true; }

  const tile = opener && opener.classList && opener.classList.contains('project-tile') ? opener : null;
  const run = () => {
    if (tile) tile.classList.remove('is-source');
    renderCase(idx);
    if (!wasOpen) { pageOverlayOn(); monitor.stop && monitor.stop(); syncPlayback(); }
    if (!opts.fromHash || !wasOpen) csClose.focus({ preventScroll: true });
  };

  if (!motionOK() || opts.instant) { run(); return; }
  if (document.startViewTransition) {
    if (wasOpen) {
      rootEl.classList.add('vt-next');
      const vt = document.startViewTransition(run);
      vt.finished.finally(() => rootEl.classList.remove('vt-next'));
    } else {
      if (tile) { tile.classList.add('is-source'); rootEl.classList.add('vt-tile-active'); }
      const vt = document.startViewTransition(run);
      vt.finished.finally(() => { if (tile) tile.classList.remove('is-source'); rootEl.classList.remove('vt-tile-active'); });
    }
  } else if (!wasOpen && opener && opener.getBoundingClientRect) {
    const r = opener.getBoundingClientRect();
    const from = `inset(${r.top}px ${innerWidth - r.right}px ${innerHeight - r.bottom}px ${r.left}px round 4px)`;
    run();
    caseStudy.animate([{ clipPath: from }, { clipPath: 'inset(0 0 0 0 round 0)' }], { duration: 700, easing: 'cubic-bezier(.65,0,.35,1)' });
  } else {
    run();
  }
}

function focusAfterClose() {
  const tile = tileEls[csIdx];
  let target = null;
  if (csOpener && document.contains(csOpener) && csOpener.offsetParent !== null && !(csOpener.classList && csOpener.classList.contains('hidden'))) target = csOpener;
  if (tile && !tile.classList.contains('hidden') && csOpener && csOpener.classList && csOpener.classList.contains('project-tile')) target = tile;
  if (!target) target = $('#workTitle');
  if (target === $('#workTitle')) target.setAttribute('tabindex', '-1');
  target.focus({ preventScroll: true });
}
let csClosing = false;
function doClose() {
  if (!csIsOpen() || csClosing) return;
  csClosing = true;
  const tile = tileEls[csIdx];
  const canMorph = tile && !tile.classList.contains('hidden') && csScroll.scrollTop < 4 &&
    (() => { const r = tile.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; })();
  const finish = () => {
    csClosing = false;
    if (canMorph && document.startViewTransition && motionOK()) tile.classList.add('is-source');
    pageOverlayOff();
    csUnloadVideos();
    csStage.innerHTML = '';
    focusAfterClose();
    syncPlayback();
    if (monitor.started) monitorNext();
    if (csPendingScroll) { const el = document.getElementById(csPendingScroll); csPendingScroll = ''; if (el) el.scrollIntoView(); }
  };
  if (!motionOK()) { finish(); return; }
  if (document.startViewTransition) {
    if (canMorph) rootEl.classList.add('vt-tile-active');
    const vt = document.startViewTransition(finish);
    vt.finished.finally(() => { rootEl.classList.remove('vt-tile-active'); if (tile) tile.classList.remove('is-source'); });
  } else {
    const a = caseStudy.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, easing: 'ease-out' });
    a.finished.then(finish, finish);
  }
}
function closeCase() {
  if (!csIsOpen()) return;
  if (csPushed) { csPushed = false; history.back(); }        // popstate runs doClose
  else { history.replaceState(null, '', location.pathname + location.search); doClose(); }
}

csClose.addEventListener('click', closeCase);
$('#csBack').addEventListener('click', closeCase);
$('#csContact').addEventListener('click', (e) => { e.preventDefault(); csPendingScroll = 'contact'; closeCase(); });
$('#csNext').addEventListener('click', (e) => {
  e.preventDefault();
  openCase(parseInt($('#csNext').dataset.next, 10), null);
});
document.addEventListener('keydown', (e) => {
  if (!csIsOpen()) return;
  if (e.key === 'Escape') { e.preventDefault(); closeCase(); return; }
  if (e.key === 'Tab') {
    const f = $$('button, a[href], video[controls], [tabindex]:not([tabindex="-1"])', caseStudy).filter(el => el.offsetParent !== null || el === csClose);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && (document.activeElement === first || !caseStudy.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});

/* thumbnail that follows the pointer over "Next project" (mouse only) */
(() => {
  const nx = $('#csNext');
  nx.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const r = nx.getBoundingClientRect();
    nx.style.setProperty('--tx', `${e.clientX - r.left + 24}px`);
    nx.style.setProperty('--ty', `${e.clientY - r.top - 60}px`);
    nx.classList.add('hovering');
  });
  nx.addEventListener('pointerleave', () => nx.classList.remove('hovering'));
})();

/* tiles are real links: plain click opens the dialog, modified clicks keep default behaviour */
gridEl.addEventListener('click', (e) => {
  const tile = e.target.closest('.project-tile');
  if (!tile || e.metaKey || e.ctrlKey || e.shiftKey || e.button > 0) return;
  e.preventDefault();
  openCase(+tile.dataset.index, tile);
});

/* url sync: #project=slug opens, anything else closes (back button, shared links) */
function slugFromHash() { const m = location.hash.match(/^#project=([\w-]+)$/); return m ? m[1] : null; }
function syncFromHash() {
  const slug = slugFromHash();
  const idx = slug ? PROJECTS.findIndex(p => p.slug === slug) : -1;
  if (idx > -1) {
    if (!csIsOpen()) openCase(idx, null, { fromHash: true, instant: true });
    else if (idx !== csIdx) openCase(idx, null, { fromHash: true });
  } else if (csIsOpen()) doClose();
}
window.addEventListener('popstate', syncFromHash);
window.addEventListener('hashchange', syncFromHash);

/* ============ INIT ============ */
renderTileText();
renderFilters();
renderWorkMeta();
layoutTiles();
initMonitor();
armHero();
onLangChange(() => { renderTileText(); renderFilters(); renderWorkMeta(); if (csIsOpen()) renderCaseText(csIdx); });
syncFromHash();
