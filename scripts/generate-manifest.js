/**
 * Writes public/manifest.json with the GitHub Pages base path baked in.
 *
 * The committed manifest used absolute "/" paths. On a project site served
 * from omgr.github.io/kalyanam those resolve to the domain root, so the icon
 * 404'd on every page load and "Add to Home Screen" installed a shortcut that
 * opened the wrong URL. The file is generated (and gitignored) the same way
 * sw.js and workbox already are.
 */
const fs = require('fs');
const path = require('path');

const repo = process.env.GITHUB_PAGES_REPO || '';
const basePath = repo ? `/${repo}` : '';

const manifest = {
  name: 'Kalyanam - Wedding Planner',
  short_name: 'Kalyanam',
  description:
    'Plan your perfect wedding with Kalyanam. Track events, manage budgets, coordinate with family, and celebrate your culture.',
  start_url: `${basePath}/dashboard`,
  scope: `${basePath}/`,
  display: 'standalone',
  background_color: '#FFF8F0',
  theme_color: '#FF6F00',
  orientation: 'portrait-primary',
  lang: 'en',
  categories: ['lifestyle', 'productivity', 'social'],
  icons: [
    {
      src: `${basePath}/icons/icon.svg`,
      sizes: 'any',
      type: 'image/svg+xml',
      purpose: 'any',
    },
  ],
};

const out = path.join(__dirname, '..', 'public', 'manifest.json');
fs.writeFileSync(out, JSON.stringify(manifest, null, 2) + '\n');
console.log(`Wrote ${out} (basePath: ${basePath || '<none>'})`);
