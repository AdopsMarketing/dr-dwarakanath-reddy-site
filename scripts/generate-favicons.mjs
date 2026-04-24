import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = resolve('public/logo.jpg');
const pub = (p) => resolve('public', p);

// Trim surrounding whitespace around the logo mark, then contain into a square
// canvas with a paper-1 background so every favicon size reads clean.
const PAPER_1 = { r: 0xFA, g: 0xF7, b: 0xF1, alpha: 1 };

async function makeSquare(size, background = PAPER_1) {
  return sharp(src)
    .trim({ threshold: 15 })
    .resize({
      width: size,
      height: size,
      fit: 'contain',
      background,
    })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function main() {
  // Individual favicon PNGs
  const sizes = [16, 32, 48, 180];
  const bufs = {};
  for (const s of sizes) {
    bufs[s] = await makeSquare(s);
  }

  writeFileSync(pub('favicon-16x16.png'), bufs[16]);
  writeFileSync(pub('favicon-32x32.png'), bufs[32]);
  writeFileSync(pub('apple-touch-icon.png'), bufs[180]);

  // Multi-size .ico from 16/32/48
  const icoBuf = await pngToIco([bufs[16], bufs[32], bufs[48]]);
  writeFileSync(pub('favicon.ico'), icoBuf);

  // OG image: 1200x630 with logo centered on paper-1, ink title below
  const logoSquare = await sharp(src)
    .trim({ threshold: 15 })
    .resize({ width: 360, height: 360, fit: 'contain', background: PAPER_1 })
    .png()
    .toBuffer();

  const svgTitle = Buffer.from(`
    <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
      <rect width="1200" height="630" fill="#FAF7F1"/>
      <text x="600" y="486" font-family="Georgia, serif" font-style="italic" font-size="48" fill="#0B2540" text-anchor="middle">Dr. Dwarakanath Reddy V</text>
      <text x="600" y="540" font-family="Courier, monospace" font-size="20" fill="#3D4452" text-anchor="middle" letter-spacing="6">SURGICAL GASTROENTEROLOGY · NELLORE</text>
    </svg>
  `);

  await sharp({
    create: { width: 1200, height: 630, channels: 4, background: PAPER_1 },
  })
    .composite([
      { input: logoSquare, top: 60, left: (1200 - 360) / 2 },
      { input: svgTitle, top: 0, left: 0 },
    ])
    .jpeg({ quality: 88, progressive: true })
    .toFile(pub('og-image.jpg'));

  console.log('✓ favicon-16x16.png');
  console.log('✓ favicon-32x32.png');
  console.log('✓ apple-touch-icon.png');
  console.log('✓ favicon.ico');
  console.log('✓ og-image.jpg');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
