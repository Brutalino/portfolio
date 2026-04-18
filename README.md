# Portfolio — fabiomarconi.com

Personal portfolio of **Fabio Marconi** — AI Engineer & Full-Stack Developer.
A scroll-driven single-page site built around a 3D ASCII-rendered face, a typewriter
`neofetch` terminal, and a compositing-friendly project layout that reflows across
16:9 desktops, non-16:9 laptops, tablets and phones.

Live: https://fabiomarconi.com

---

## Stack

| Layer          | Choice                                                  |
|----------------|---------------------------------------------------------|
| Build          | [Vite 8](https://vitejs.dev/) + `@vitejs/plugin-react` |
| UI             | React 19 (no router — single page)                      |
| 3D / ASCII     | [three.js](https://threejs.org/) 0.183 via [`@react-three/fiber`](https://r3f.docs.pmnd.rs/) + [`@react-three/drei`](https://drei.docs.pmnd.rs/) `AsciiRenderer` |
| Scroll / Anim. | [GSAP 3](https://gsap.com/) + `ScrollTrigger` (desktop), `IntersectionObserver` (mobile) |
| Icons          | `react-icons` (Simple Icons, Font Awesome, Bootstrap, Tabler, Devicons) |
| Deploy         | `gh-pages` → GitHub Pages, custom domain via `public/CNAME` |

No CSS framework. All styling is hand-written CSS, split per component + one
global responsive sheet.

---

## What it does

- **Hero** — large ASCII-rendered 3D face sits fixed in the viewport; name and
  role float on either side.
- **Scroll-driven face animation** — on scroll, the face scales down and drifts
  left-of-center while the next section slides up. Driven by a single smoothed
  progress value fed by `ScrollTrigger.onUpdate` into a `requestAnimationFrame`
  lerp loop for jank-free transforms.
- **About + `neofetch`** — terminal window types out the `neofetch` command,
  unfolds an ASCII braille portrait and dumps `name/role/passions/location/github`
  with per-label theme colors. Terminal border animates in with a scale-Y pop.
- **Projects** — first 3 projects tile into a horizontal "cards" layout with
  per-card typewriter headers and output. Remaining projects live in a grid of
  compact cards with click-to-expand descriptions.
- **Tech stack** — responsive grid of icon cards (Java, Python, React, PyTorch,
  …). 11 columns on wide desktop, 8 on laptop, 5 on tablet, 3 on mobile,
  2 on phones.
- **Footer** — contact links.
- **Top bar** — `about / work / contact` navigation + theme dropdown.
- **Theme switcher** — 5 curated palettes (Monochrome, Dracula, Everforest,
  Gruvbox, Catppuccin). Swapped live via CSS custom properties on `:root`.
- **Custom cursor** (desktop only) — `mix-blend-mode: difference` blob that
  trails the real cursor with a lerp delay. Hidden on touch devices.

---

## Architecture

```
portfolio-ascii/
├── public/
│   ├── CNAME                         # custom domain (fabiomarconi.com)
│   ├── favicon.svg
│   ├── head_planes_-_reference.glb   # 3D head model for AsciiRenderer
│   └── icons.svg
├── src/
│   ├── main.jsx                      # entry — CSS import order matters
│   ├── index.css                     # reset + page/container base
│   ├── App.jsx                       # layout, 3D scene, scroll logic
│   ├── App.css                       # hero, about, topbar, cursor, themes
│   ├── themes.js                     # 5 color palettes
│   ├── styles/
│   │   └── responsive.css            # ALL media queries — loaded LAST
│   └── components/
│       ├── TerminalWindow.{jsx,css}
│       ├── Neofetch.{jsx,css}
│       ├── ProjectsSection.{jsx,css}
│       ├── TechStackSection.{jsx,css}
│       ├── BioSection.jsx
│       └── Footer.{jsx,css}
├── index.html
├── vite.config.js
├── eslint.config.js
└── package.json
```

### CSS cascade

ES-module imports load in dependency order: child component CSS files evaluate
before `App.jsx`'s own module code. If `responsive.css` were imported inside
`App.jsx` it would load **before** `TerminalWindow.css`, `ProjectsSection.css`
etc. — and their base styles would override the responsive rules on small
screens.

Fix: `main.jsx` imports `responsive.css` **last**, after `App.jsx`:

```js
import './index.css'
import App from './App.jsx'
import './styles/responsive.css'   // must stay last
```

### Scroll-animation pipeline (desktop)

1. `.scroll-spacer` wraps the hero and a `100vh` spacer.
2. A `ScrollTrigger` on `.scroll-spacer` writes raw progress into a ref.
3. A second `ScrollTrigger` on `.about-section` writes raw exit-progress.
4. An RAF loop lerps raw → smooth progress (`0.18` factor) and applies
   `transform: translateX()/translateY()` to the fixed `.face-wrapper` every
   frame. No CSS transitions involved — the smoothing replaces them.
5. Inside `AsciiFace` (r3f), the same shared `scrollState` drives camera/mesh
   scale so the 3D face tracks the DOM.

### Breakpoints (`src/styles/responsive.css`)

| Range             | Target                                 | Key adjustments |
|-------------------|----------------------------------------|-----------------|
| `≤ 1440px`        | Laptops (16:10 / 3:2 MacBooks)         | about-content 56%, tech grid 8 cols, neofetch label-above-value |
| `≤ 1200px`        | Small laptops / wide tablets           | about-content 62%, neofetch logo 10px |
| `≤  900px`        | Tablet landscape                       | Tech grid 5 cols, more-projects 2 cols |
| `≤  768px`        | Mobile / tablet portrait               | Face hidden, projects sticky → stacked, tech grid 3 cols |
| `(hover: none)`   | All touch devices                      | Reset stuck `:hover` states from iOS tap |
| `≤  480px`        | Small phones                           | Tech grid 2 cols |

### Mobile path

On `window.innerWidth ≤ 768`:

- `<AsciiFace>` and hero spacer **are not rendered** (saves the Three.js
  canvas + scroll travel).
- Custom cursor is not rendered.
- `gsap.registerPlugin(ScrollTrigger)` is **never called** — it's moved inside
  desktop-only `useEffect` branches so GSAP's non-passive touch listeners are
  never attached. On iOS WebKit those listeners were the cause of a
  tap-to-toggle scroll-block bug.
- Section reveals use `IntersectionObserver` instead of `ScrollTrigger`
  (`TechStackSection`, terminal activation in `App.jsx`, project card
  activation in `ProjectsSection`).
- Project tiling collapses to a vertical stack (`position: relative !important`
  in `responsive.css` defeats any lingering GSAP inline styles).
- `will-change`, `backdrop-filter` and `overflow: hidden` are stripped from the
  terminal window — on iOS each creates a compositing layer that can capture
  touch events and block the page scroll.

---

## Running locally

```bash
cd portfolio-ascii
npm install
npm run dev         # http://localhost:5173
npm run build       # production bundle → dist/
npm run preview     # serve dist/ locally
npm run lint
```

### Testing responsiveness

Chrome DevTools → Device toolbar. Breakpoints to eyeball:

- **2560×1440** — wide 16:9, content-container caps at `100vh * 16/9`.
- **1512×982** — MacBook Pro 14" (3:2). Triggers the `≤ 1440px` laptop path.
- **1366×768** — classic laptop.
- **768×1024** — iPad portrait.
- **390×844** — iPhone 14.

Real-device iOS testing is non-negotiable — several bugs in this codebase
(scroll toggle, sticky `:hover`, compositing-layer touch capture) only
reproduce on actual WebKit, not in the simulator.

---

## Deployment

```bash
npm run deploy
```

This runs `vite build` then pushes `dist/` to the `gh-pages` branch via the
`gh-pages` npm package. GitHub Pages serves that branch; `public/CNAME`
declares `fabiomarconi.com` so the custom domain is preserved across deploys.

Branch flow:

- `dev` — active development.
- `master` — tagged production snapshots.
- `gh-pages` — machine-written, never edit by hand.

---

## Adding content

### A new project

Edit the `PROJECTS` array in
[`src/components/ProjectsSection.jsx`](src/components/ProjectsSection.jsx).
The first three entries render in the featured tiling layout; any beyond are
appended to the `more-projects-grid`.

```js
{
  name: 'project-slug',
  description: 'Plain text — supports long paragraphs.',
  tech: 'Python, PyTorch, CUDA',
  link: 'github.com/you/repo',
}
```

### A new tech-stack icon

Edit the `TECHS` array in
[`src/components/TechStackSection.jsx`](src/components/TechStackSection.jsx).
Icons come from `react-icons` — pick a set (`Si*`, `Fa*`, `Bs*`, `Tb*`, `Di*`)
and import it at the top of the file.

### A new theme

Add an entry to [`src/themes.js`](src/themes.js):

```js
mytheme: {
  name: 'MyTheme',
  background: '#…',
  foreground: '#…',
  accent:     '#…',
  borderHover:'#…',
  colors: [ /* 16 hex values — used by neofetch color swatches + labels */ ],
}
```

The dropdown in the top bar picks up new themes automatically.

---

## Known quirks

- The bundle is ~1.3 MB, gzipped to ~390 kB. Three.js + drei dominate. Code
  splitting the 3D scene behind a dynamic import is a future win but not wired
  up yet.
- `overflow-x: hidden` is set on `body` and `#root` only — setting it on `html`
  too causes Chrome/Firefox to render a double scrollbar during the initial
  scroll range.
- `ScrollTrigger.disable()` does **not** remove the global touch listeners
  GSAP attaches at `registerPlugin` time. That's why registration is gated
  behind desktop-only `useEffect` guards rather than disabled after the fact.

---

## License

Personal project. Code provided as-is — feel free to read and borrow patterns.
Please don't reuse the portrait asset, name, or copy verbatim.
