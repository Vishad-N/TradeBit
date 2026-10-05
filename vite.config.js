import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Two HTML entries: the main Strata app (index.html, with its React Router routes) and the
// standalone Trade Bit masterclass page (tt-1/index.html, served at /tt-1/). They are separate
// entries rather than one router so each page loads only its own CSS: the two stylesheets
// share many class names (.btn, .wrap, .hero, …) with different designs.

const PAGE_DIRS = ['/tt-1'];

// Static hosts redirect /tt-1 → /tt-1/ themselves; Vite's dev/preview servers would instead
// fall back to the main app, so mirror the host behaviour here.
function trailingSlashRedirect() {
  const middleware = (req, res, next) => {
    const [path, query = ''] = req.url.split('?');
    if (!PAGE_DIRS.includes(path)) return next();
    res.statusCode = 301;
    res.setHeader('Location', `${path}/${query && `?${query}`}`);
    res.end();
  };
  return {
    name: 'trailing-slash-redirect',
    // Block bodies on purpose: a function returned from these hooks is run as a post-hook.
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}

export default defineConfig({
  plugins: [react(), trailingSlashRedirect()],
  build: {
    rolldownOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        tt1: resolve(import.meta.dirname, 'tt-1/index.html'),
      },
    },
  },
});
