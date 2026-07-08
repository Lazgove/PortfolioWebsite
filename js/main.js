/* ============ I18N ============ */
let currentLang = localStorage.getItem('lang') || 'en';

function t(key) {
  return I18N[currentLang][key] || I18N.en[key] || key;
}

function applyLang() {
  document.documentElement.lang = currentLang;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if (I18N[currentLang][key]) el.textContent = I18N[currentLang][key];
  });
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    const key = el.dataset.i18nHtml;
    if (I18N[currentLang][key]) el.innerHTML = I18N[currentLang][key];
  });
  document.getElementById('langToggle').textContent = currentLang === 'en' ? 'FR' : 'EN';
}

document.getElementById('langToggle').addEventListener('click', () => {
  currentLang = currentLang === 'en' ? 'fr' : 'en';
  localStorage.setItem('lang', currentLang);
  applyLang();
});

/* ============ DARK MODE ============ */
const themeToggle = document.getElementById('themeToggle');
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
let currentTheme = localStorage.getItem('theme') || (prefersDark ? 'dark' : 'light');

function applyTheme() {
  if (currentTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
}
applyTheme();

themeToggle.addEventListener('click', () => {
  currentTheme = currentTheme === 'light' ? 'dark' : 'light';
  localStorage.setItem('theme', currentTheme);
  applyTheme();
});

/* ============ MOBILE NAV ============ */
const menuToggle = document.getElementById('menuToggle');
const headerEl = document.querySelector('header');

menuToggle.addEventListener('click', () => {
  headerEl.classList.toggle('nav-open');
});

document.querySelectorAll('nav a').forEach(link => {
  link.addEventListener('click', () => {
    headerEl.classList.remove('nav-open');
  });
});

/* ============ RENDER PROJECT GRID ============ */
const gridEl = document.getElementById('project-grid');
PROJECTS.forEach((p, i) => {
  const tile = document.createElement('div');
  tile.className = 'project-tile';
  tile.dataset.index = i;

  const isVideo = p.hero && p.hero.endsWith('.mp4');
  const posStyle = p.heroPosition ? ` style="object-position:${p.heroPosition}"` : '';
  const mediaHtml = isVideo
    ? `<video class="tile-video" src="media/${p.hero}" autoplay loop muted playsinline${posStyle}${p.heroStart ? ` data-start="${p.heroStart}"` : ''}></video>`
    : `<div class="ph"></div>`;

  tile.innerHTML = `
    ${mediaHtml}
    <span class="tile-view" data-i18n="tile.view">${t('tile.view')}</span>
    <div class="tile-info">
      <div class="tile-title">${p.title}</div>
    </div>
  `;
  const vid = tile.querySelector('video[data-start]');
  if (vid) {
    vid.addEventListener('loadedmetadata', () => { vid.currentTime = parseFloat(vid.dataset.start); });
  }
  tile.addEventListener('click', () => openCaseStudy(i));
  gridEl.appendChild(tile);
});

/* ============ FILTER BAR ============ */
const filterBar = document.getElementById('filter-bar');
const allTags = [...new Set(PROJECTS.flatMap(p => p.tags))];

const allBtn = document.createElement('button');
allBtn.className = 'filter-tag active';
allBtn.dataset.tag = 'all';
allBtn.textContent = t('filter.all');
allBtn.setAttribute('data-i18n', 'filter.all');
filterBar.appendChild(allBtn);

allTags.forEach(tag => {
  const btn = document.createElement('button');
  btn.className = 'filter-tag';
  btn.dataset.tag = tag;
  btn.textContent = tag;
  filterBar.appendChild(btn);
});

filterBar.addEventListener('click', (e) => {
  const btn = e.target.closest('.filter-tag');
  if (!btn) return;

  filterBar.querySelectorAll('.filter-tag').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  const tag = btn.dataset.tag;
  document.querySelectorAll('.project-tile').forEach(tile => {
    const idx = parseInt(tile.dataset.index);
    const project = PROJECTS[idx];
    if (tag === 'all' || project.tags.includes(tag)) {
      tile.classList.remove('hidden');
    } else {
      tile.classList.add('hidden');
    }
  });
});

/* ============ CASE STUDY OVERLAY ============ */
const caseStudy = document.getElementById('caseStudy');
const csClose = document.getElementById('csClose');

function openCaseStudy(idx) {
  const p = PROJECTS[idx];
  const desc = currentLang === 'fr' && p.desc_fr ? p.desc_fr : p.desc;

  const heroEl = document.querySelector('.cs-hero');
  if (p.hero && p.hero.endsWith('.mp4')) {
    heroEl.innerHTML = `<video src="media/${p.hero}" autoplay loop muted playsinline style="width:100%;height:100%;object-fit:cover;"></video>`;
  } else {
    heroEl.innerHTML = `<div class="ph"><span id="csHeroLabel">// ${p.hero}</span></div>`;
  }

  document.getElementById('csTitle').textContent = p.title;
  document.getElementById('csDesc').textContent = desc;

  document.getElementById('csCredits').innerHTML = `
    <div><b>${t('cs.client')}</b><span>${p.client}</span></div>
    <div><b>${t('cs.role')}</b><span>${p.role}</span></div>
    <div><b>${t('cs.tools')}</b><span>${p.tools}</span></div>
    <div><b>${t('cs.year')}</b><span>${p.year}</span></div>
  `;

  const mediaEl = document.getElementById('csMedia');
  mediaEl.innerHTML = p.stills.map(s => {
    if (s.endsWith('.mp4')) {
      return `<div class="cs-still"><video src="media/${s}" controls muted playsinline></video></div>`;
    }
    if (s.endsWith('.gif') || s.endsWith('.jpg') || s.endsWith('.jpeg') || s.endsWith('.png') || s.endsWith('.webp')) {
      return `<div class="cs-still"><img src="media/${s}" alt="" loading="lazy"></div>`;
    }
    return `<div class="cs-still"><div class="ph"><span>// ${s}</span></div></div>`;
  }).join('');

  const nextIdx = (idx + 1) % PROJECTS.length;
  const nextLink = document.getElementById('csNext');
  nextLink.textContent = PROJECTS[nextIdx].title;
  nextLink.onclick = (e) => { e.preventDefault(); openCaseStudy(nextIdx); caseStudy.scrollTo(0, 0); };

  caseStudy.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeCaseStudy() {
  caseStudy.querySelectorAll('video').forEach(v => { v.pause(); v.src = ''; });
  caseStudy.classList.remove('open');
  document.body.style.overflow = '';
}
csClose.addEventListener('click', closeCaseStudy);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeCaseStudy();
});

/* ============ NAV ACTIVE STATE ON SCROLL ============ */
const sections = ['work', 'contact'].map(id => document.getElementById(id));
const navLinks = document.querySelectorAll('nav a');
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navLinks.forEach(l => l.classList.remove('active'));
      const match = document.querySelector(`nav a[href="#${entry.target.id}"]`);
      if (match) match.classList.add('active');
    }
  });
}, { threshold: 0.4 });
sections.forEach(s => observer.observe(s));

/* ============ INIT LANG ============ */
if (currentLang !== 'en') applyLang();
