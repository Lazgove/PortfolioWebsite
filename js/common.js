/* Shared by index.html and playground.html: theme, language, menu, clock, cursor, motion gates. */

/* ============ MOTION AND CAPABILITY GATES ============ */
const RM = window.matchMedia('(prefers-reduced-motion: reduce)');
const FINE = window.matchMedia('(hover: hover) and (pointer: fine)');
const SAVE = !!(navigator.connection && navigator.connection.saveData);
const motionOK = () => !RM.matches;
const autoplayOK = () => !RM.matches && !SAVE;
function syncRM() { document.documentElement.classList.toggle('rm', RM.matches); }
syncRM();
if (RM.addEventListener) RM.addEventListener('change', syncRM);

function store(key, value) {
  try {
    if (value === undefined) return localStorage.getItem(key);
    localStorage.setItem(key, value);
  } catch (e) { /* storage can be blocked */ }
  return null;
}

/* ============ I18N ============ */
let currentLang = store('lang') === 'fr' ? 'fr' : 'en';
const langListeners = [];
function onLangChange(fn) { langListeners.push(fn); }

function t(key) {
  return (I18N[currentLang] && I18N[currentLang][key]) || I18N.en[key] || key;
}

function applyLang() {
  const root = document.documentElement;
  root.lang = currentLang;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    el.innerHTML = t(el.dataset.i18nHtml);
  });
  document.querySelectorAll('[data-i18n-label]').forEach(el => {
    el.setAttribute('aria-label', t(el.dataset.i18nLabel));
  });
  const page = document.body.dataset.page || 'home';
  document.title = t('meta.title.' + page);
  const md = document.querySelector('meta[name="description"]');
  if (md) md.setAttribute('content', t('meta.desc.' + page));
  const lt = document.getElementById('langToggle');
  if (lt) {
    lt.textContent = currentLang === 'en' ? 'FR' : 'EN';
    lt.setAttribute('aria-label', t('a11y.lang'));
    lt.setAttribute('lang', currentLang === 'en' ? 'fr' : 'en');
  }
  langListeners.forEach(fn => fn(currentLang));
}

const langBtn = document.getElementById('langToggle');
if (langBtn) {
  langBtn.addEventListener('click', () => {
    currentLang = currentLang === 'en' ? 'fr' : 'en';
    store('lang', currentLang);
    applyLang();
  });
}

/* ============ THEME ============ */
let currentTheme = store('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
function applyTheme() {
  const root = document.documentElement;
  if (currentTheme === 'dark') root.setAttribute('data-theme', 'dark');
  else root.removeAttribute('data-theme');
  const btn = document.getElementById('themeToggle');
  if (btn) btn.setAttribute('aria-pressed', currentTheme === 'dark' ? 'true' : 'false');
}
applyTheme();
const themeBtn = document.getElementById('themeToggle');
if (themeBtn) {
  themeBtn.addEventListener('click', () => {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    store('theme', currentTheme);
    applyTheme();
  });
}

/* ============ MOBILE MENU ============ */
const siteHeader = document.getElementById('siteHeader');
const menuToggle = document.getElementById('menuToggle');
function setMenu(open) {
  siteHeader.classList.toggle('nav-open', open);
  menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
}
if (menuToggle) {
  menuToggle.addEventListener('click', () => setMenu(!siteHeader.classList.contains('nav-open')));
  document.querySelectorAll('#siteNav a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && siteHeader.classList.contains('nav-open')) { setMenu(false); menuToggle.focus(); }
  });
}

/* ============ HEADER BACKGROUND AFTER THE FIRST SCREEN ============ */
function headerState() { siteHeader.classList.toggle('scrolled', window.scrollY > 40); }
window.addEventListener('scroll', headerState, { passive: true });
headerState();

/* ============ PARIS CLOCK ============ */
const clockEls = document.querySelectorAll('[data-clock]');
if (clockEls.length) {
  const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' });
  const tick = () => { const s = fmt.format(new Date()); clockEls.forEach(el => { el.textContent = s; }); };
  tick();
  setInterval(tick, 30000);
}

/* ============ CURSOR CHIP (desktop pointer only) ============ */
(function () {
  const c = document.querySelector('.cursor');
  if (!c || !FINE.matches || !motionOK()) return;
  const label = c.querySelector('span');
  let x = 0, y = 0, cx = 0, cy = 0, running = false, first = true;
  function tick() {
    cx += (x - cx) * 0.22; cy += (y - cy) * 0.22;
    c.style.setProperty('--x', cx.toFixed(1) + 'px');
    c.style.setProperty('--y', cy.toFixed(1) + 'px');
    if (Math.abs(x - cx) + Math.abs(y - cy) > 0.1) requestAnimationFrame(tick); else running = false;
  }
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    x = e.clientX; y = e.clientY;
    if (first) { cx = x; cy = y; first = false; }
    c.classList.add('on');
    if (!running) { running = true; requestAnimationFrame(tick); }
  }, { passive: true });
  document.addEventListener('pointerover', (e) => {
    if (e.pointerType !== 'mouse') return;
    const tile = e.target.closest('[data-cursor="view"]');
    const link = e.target.closest('a, button');
    c.classList.toggle('is-tile', !!tile);
    c.classList.toggle('is-link', !tile && !!link);
    if (tile) label.textContent = t('tile.view');
  });
  document.documentElement.addEventListener('pointerleave', () => c.classList.remove('on'));
})();

/* ============ INIT ============ */
applyLang();
