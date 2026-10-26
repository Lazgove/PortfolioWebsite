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

/* ============ INIT ============ */
renderTileText();
renderFilters();
renderWorkMeta();
layoutTiles();
onLangChange(() => { renderTileText(); renderFilters(); renderWorkMeta(); });
