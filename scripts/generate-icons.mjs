import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'icons');
mkdirSync(outDir, { recursive: true });

const leaf = `
  <g fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/>
    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
  </g>
`;

function iconSvg(size, round, pad) {
  const inner = 24;
  const scale = (size * (1 - pad * 2)) / inner;
  const x = (size - inner * scale) / 2;
  const y = (size - inner * scale) / 2 - size * 0.02;
  const radius = Math.round(size * 0.22);
  const bg = round
    ? `<rect width="${size}" height="${size}" rx="${radius}" fill="#4f947b"/>`
    : `<rect width="${size}" height="${size}" fill="#4f947b"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${bg}<g transform="translate(${x} ${y}) scale(${scale})">${leaf}</g></svg>`;
}

function writePng(name, svg, size) {
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng();
  writeFileSync(join(outDir, name), png);
}

writePng('favicon-16.png', iconSvg(16, true, 0.16), 16);
writePng('favicon-32.png', iconSvg(32, true, 0.16), 32);
writePng('icon-192.png', iconSvg(192, true, 0.16), 192);
writePng('icon-512.png', iconSvg(512, true, 0.16), 512);
writePng('apple-touch-icon.png', iconSvg(180, true, 0.16), 180);
writePng('maskable-192.png', iconSvg(192, false, 0.22), 192);
writePng('maskable-512.png', iconSvg(512, false, 0.22), 512);

console.log('Wrote leaf icons to public/icons');
