#!/usr/bin/env node
// The images and fonts of the emails (apps/api/src/emails), from the landing's own sources, so
// the email looks like the landing. Run from the repo root (needs Chromium from the web app's
// Playwright):
//
//   node docs/brand/tools/gen-email-images.cjs
//
// It writes, in apps/web/public/email:
// - wambi.png: Wambi waving, the frame of the landing's wave sprite (apps/web/public/wambi/wave.webp)
//   with the hand up, at 3x the 160px the email shows it at, full colour and full alpha (a
//   palette PNG has a hard edge that looks jagged, worst on a dark background);
// - wambito-day.png / wambito-night.png: the wordmark as the landing draws it (`.lk-logo`: Fredoka
//   700, the gold → candy gradient of tokens.json), at 3x; the night one with the night colours.
//   An image because most clients draw neither web fonts nor gradient text;
// - fonts/*.woff2: Fredoka 700 and Nunito 600/700 (OFL), for the clients that load web fonts
//   (Apple Mail, iOS Mail, Thunderbird, Outlook for Mac); the rest fall back to Arial.
//
// A changed image needs a new name (or a bump of IMAGE_VERSION in apps/api/src/emails/sign-in.ts):
// Gmail's image proxy keeps an image by its URL.

const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");

const ROOT = path.resolve(__dirname, "../../..");
const WEB = path.join(ROOT, "apps/web");
const OUT = path.join(WEB, "public/email");
const webRequire = createRequire(path.join(WEB, "package.json"));

const TOKENS = JSON.parse(
  fs.readFileSync(path.join(ROOT, "docs/design/system/project/tokens.json"), "utf8"),
).color.tokens;
const token = (name, theme) => TOKENS.find((t) => t.name === name).value[theme];

/** The sizes the email shows them at (CSS px); the PNGs are SCALE times that. */
const SCALE = 3;
const WAVE = { size: 160, sprite: "public/wambi/wave.webp", columns: 4, rows: 2, frame: 2 };
const WORDMARK = { fontSize: 40 };

const fontFile = (pkg, file) =>
  path.join(path.dirname(webRequire.resolve(`${pkg}/package.json`)), "files", file);
const FONTS = [
  ["@fontsource/fredoka", "fredoka-latin-700-normal.woff2"],
  ["@fontsource/nunito", "nunito-latin-600-normal.woff2"],
  ["@fontsource/nunito", "nunito-latin-700-normal.woff2"],
];

async function main() {
  fs.mkdirSync(path.join(OUT, "fonts"), { recursive: true });
  for (const [pkg, file] of FONTS) {
    fs.copyFileSync(fontFile(pkg, file), path.join(OUT, "fonts", file));
  }

  const { chromium } = webRequire("playwright");
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: SCALE });

  // Wambi: one frame of the sprite, drawn at its email size.
  const sprite = fs.readFileSync(path.join(WEB, WAVE.sprite)).toString("base64");
  const col = WAVE.frame % WAVE.columns;
  const row = Math.floor(WAVE.frame / WAVE.columns);
  await page.setContent(
    `<html><body style="margin:0;background:transparent">
<div id="w" style="width:${WAVE.size}px;height:${WAVE.size}px;background:url(data:image/webp;base64,${sprite}) no-repeat;background-size:${WAVE.columns * 100}% ${WAVE.rows * 100}%;background-position:${(col / (WAVE.columns - 1)) * 100}% ${(row / (WAVE.rows - 1)) * 100}%"></div>
</body></html>`,
  );
  await page.locator("#w").screenshot({ path: path.join(OUT, "wambi.png"), omitBackground: true });

  // The wordmark, as `.lk-logo` in apps/web/app/styles/app.css draws it.
  const fredoka = fs
    .readFileSync(fontFile("@fontsource/fredoka", "fredoka-latin-700-normal.woff2"))
    .toString("base64");
  for (const theme of ["day", "night"]) {
    await page.setContent(
      `<html><head><style>
@font-face{font-family:Fredoka;font-weight:700;src:url(data:font/woff2;base64,${fredoka}) format("woff2")}
body{margin:0;background:transparent}
#m{display:inline-block;padding:2px 2px 4px;font-family:Fredoka;font-weight:700;font-size:${WORDMARK.fontSize}px;line-height:1.1;
background:linear-gradient(90deg,${token("gold", theme)},${token("candy", theme)});-webkit-background-clip:text;background-clip:text;color:transparent}
</style></head><body><span id="m">Wambito</span></body></html>`,
    );
    await page.evaluate(() => document.fonts.ready);
    const box = await page.locator("#m").boundingBox();
    console.log(`wambito-${theme}.png: ${Math.round(box.width)} x ${Math.round(box.height)} px`);
    await page
      .locator("#m")
      .screenshot({ path: path.join(OUT, `wambito-${theme}.png`), omitBackground: true });
  }

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
