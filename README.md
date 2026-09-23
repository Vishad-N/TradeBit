# Strata — Landing Page

Marketing site for Strata, a trading-education programme. Built with React 19 and Vite.

## Getting started

Requires Node.js 20.19+ (or 22.12+).

```bash
npm install
npm run dev        # http://localhost:5173
```

```bash
npm run build      # production build into dist/
npm run preview    # serve the production build locally
```

## Project structure

```
index.html              page shell: meta tags, Google Font, #root
public/favicon.svg
src/
  main.jsx              React entry point
  App.jsx               page composition, menu/modal state, Escape handling
  styles/global.css     all styles (design tokens, sections, responsive rules)
  components/           one component per page section, plus shared pieces
                        (Nav, Counter, Rings, BrandMark, Faq, VideoModal)
  hooks/
    motion.js           scroll-reveal, draw-on-view, stroke-length helpers
    useScrollState.js   solid nav, active nav link, parallax, sticky mobile CTA
  lib/
    charts.js           seeded candlestick engine and generated SVG artwork
    html.js             helper for injecting generated SVG markup
```

The charts and background artwork are generated from a seeded random number
generator, so they render identically on every load.

## Customising

- **Overview video:** `src/components/VideoModal.jsx` has a placeholder frame. Put
  your YouTube, Vimeo or MP4 embed there.
- **Mentor portrait:** `src/components/Mentor.jsx` has a duotone SVG placeholder
  (the `<g id="person">` group). Replace it with a cut-out photo.
- **Checkout link:** the "Get Started Now" button in `src/components/Offer.jsx`
  points to `#checkout`. Change it to your payment URL.
- **Colours:** the four design tokens are at the top of `src/styles/global.css`.

## Deploying

The output of `npm run build` is a static site in `dist/`, so any static host
works (Vercel, Netlify, Cloudflare Pages, GitHub Pages).

For GitHub Pages at `https://<user>.github.io/<repo>/`, set `base: '/<repo>/'`
in `vite.config.js` before you build.
