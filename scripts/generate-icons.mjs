import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'icons');
mkdirSync(outDir, { recursive: true });

/**
 * Nitya brand icons.
 *
 * Source of truth:
 * - `public/icons/nitya-logo-light.png` / `nitya-logo-dark.png` are the provided
 *   Nitya lockups (symbol + wordmark), used as-is.
 * - `public/icon.svg`, `public/maskable.svg` and `public/icon-dark.svg` are
 *   self-contained wrappers that embed the Nitya symbol (two leaves + sun,
 *   cropped from the provided lockups: light crop x228 y88 w800 h655, dark crop
 *   x228 y88 w800 h645, each centred on an 800x800 canvas in its own
 *   background colour) with no other artwork. Light contexts use the white
 *   version, dark contexts use the black-theme version.
 *
 * This script only re-renders the PNG derivatives below from those SVGs, so
 * `npm run icons` never reintroduces any previous artwork.
 */

const light = readFileSync(join(root, 'public', 'icon.svg'), 'utf8');
const maskable = readFileSync(join(root, 'public', 'maskable.svg'), 'utf8');
const dark = readFileSync(join(root, 'public', 'icon-dark.svg'), 'utf8');

function writePng(name, svg, size) {
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng();
  writeFileSync(join(outDir, name), png);
}

writePng('favicon-16.png', light, 16);
writePng('favicon-32.png', light, 32);
writePng('icon-48.png', light, 48);
writePng('icon-96.png', light, 96);
writePng('icon-192.png', light, 192);
writePng('icon-512.png', light, 512);
writePng('apple-touch-icon.png', light, 180);
writePng('nitya-mark-light.png', light, 192);
writePng('maskable-192.png', maskable, 192);
writePng('maskable-512.png', maskable, 512);
writePng('nitya-mark-dark.png', dark, 192);

console.log('Wrote Nitya icons to public/icons');
