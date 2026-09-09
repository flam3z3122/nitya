import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'icons');
mkdirSync(outDir, { recursive: true });

/** Filled leaf in a 24×24 box — stays readable at 16–48px (outline Lucide does not). */
const leaf = `
  <g>
    <path fill="#ffffff" d="M12.1 1.8c4.9 1.7 8.7 6.6 8.7 11.8 0 5.4-3.9 9.2-8.8 9.2S3.2 19 3.2 13.6C3.2 8.4 7.1 3.5 12.1 1.8Z"/>
    <path fill="none" stroke="#2c6a55" stroke-width="2.1" stroke-linecap="round" d="M11.2 20.6C9.8 14.6 12.4 8.6 17.6 4.8"/>
  </g>
`;

function iconSvg(size, round, pad) {
  const inner = 24;
  const scale = (size * (1 - pad * 2)) / inner;
  const x = (size - inner * scale) / 2;
  const y = (size - inner * scale) / 2;
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

writePng('favicon-16.png', iconSvg(16, true, 0.06), 16);
writePng('favicon-32.png', iconSvg(32, true, 0.06), 32);
writePng('icon-48.png', iconSvg(48, true, 0.08), 48);
writePng('icon-96.png', iconSvg(96, true, 0.1), 96);
writePng('icon-192.png', iconSvg(192, true, 0.1), 192);
writePng('icon-512.png', iconSvg(512, true, 0.1), 512);
writePng('apple-touch-icon.png', iconSvg(180, true, 0.1), 180);
writePng('maskable-192.png', iconSvg(192, false, 0.12), 192);
writePng('maskable-512.png', iconSvg(512, false, 0.12), 512);

writeFileSync(join(root, 'public', 'icon.svg'), iconSvg(512, true, 0.1));
writeFileSync(join(root, 'public', 'maskable.svg'), iconSvg(512, false, 0.12));

console.log('Wrote filled leaf icons to public/icons');
