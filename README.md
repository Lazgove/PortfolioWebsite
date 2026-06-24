# Guillaume Abramovici — Motion Design Portfolio

Static portfolio site. No build step, no framework — plain HTML/CSS/JS, split into clean files.

## Structure

```
index.html        → markup only
css/style.css      → all styles (design tokens, layout, components)
js/data.js          → PROJECTS array — the content for the work grid + case studies
js/main.js          → rendering + interaction logic (grid render, case study overlay, nav scroll state)
404.html          → fallback page for broken/missing routes
netlify.toml      → Netlify deploy config (publish dir + headers)
media/            → put real video/image files here (currently empty)
```

## Why split this way

`data.js` is separated from `main.js` specifically because it's the file you'll edit constantly (swapping titles, descriptions, media filenames) while `main.js` is logic you'll rarely touch. Keeping them apart means git diffs on content changes stay small and readable.

## How the site is organized

- **Design tokens** — CSS custom properties at the top of `css/style.css` (`--bg`, `--ink`, `--accent`, etc.) control the whole color system. Change them there, not per-element.
- **Fonts** — Noto Sans (headlines), Open Sans (body text), Noto Sans Mono (utility/credits text), loaded via Google Fonts `<link>` in `index.html`.
- **PROJECTS array** — in `js/data.js`. Single source of truth for the work grid and case study pages. Each entry:
  ```js
  {
    title: "SportyBet — Vega Drop",
    tools: "Blender / AE",
    year: "2026",
    role: "3D Animation, Compositing",
    client: "SportyBet Nigeria",
    application: "Social / 9:16",
    desc: "...",
    hero: "vega_drop_hero.mp4",   // currently a placeholder filename
    stills: ["scene_01_still.png", "scene_02_still.png"]  // also placeholders
  }
  ```
- **Placeholder media** — every `hero`/`stills` value is currently just a filename string used to *label* a diagonal-striped placeholder block. Nothing is actually loaded from disk yet. The placeholder markup lives inline in `js/main.js` (grid tile template and `openCaseStudy()`).

## Next steps (swapping in real media)

1. Drop real files into `media/` (e.g. `media/vega_drop_hero.mp4`).
2. In `js/data.js`, update `hero`/`stills` to point at real paths, e.g. `hero: "media/vega_drop_hero.mp4"`.
3. In `js/main.js`, replace the placeholder `<div class="ph">...</div>` markup (in the grid tile template and `openCaseStudy()`) with real `<video>` / `<img>` tags pointing at the path in `p.hero` / each entry in `p.stills`.

## Real contact info already wired in

- Email: guillaume.abramovici@outlook.fr
- Phone: +33 6 37 30 03 18
- Instagram, Malt, LinkedIn, Vimeo showreel — all linked in the footer

## Case study titles are still placeholders

The 7 project titles (SportyBet — Vega Drop, BoreDraw Explained, etc.) were invented based on general CV context, not pulled from a real project list. Update the fields in `js/data.js` once real project details are available.

## Deploying

Static site — no build step. Netlify: drag-and-drop this folder at app.netlify.com/drop, or connect via GitHub for auto-deploy on push. `netlify.toml` already sets the publish directory to `.` (project root).
