// One-off script: generates pwa-192x192.png and pwa-512x512.png from app-icon.svg.
// Run from repo root: node tools/generate-icons.mjs

import puppeteer from 'puppeteer-core'
import { writeFileSync, readFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { resolve, dirname } from 'path'

const __dir = dirname(fileURLToPath(import.meta.url))
const logoPath = resolve(__dir, '../apps/web/public/app-icon.svg')
const outDir = resolve(__dir, '../apps/web/public')

const BROWSER_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
]

const browserPath = BROWSER_CANDIDATES.find(p => existsSync(p))
if (!browserPath) {
  console.error('Chrome or Edge not found.')
  process.exit(1)
}
console.log('Using browser at:', browserPath)

const svgContent = readFileSync(logoPath, 'utf8')

for (const size of [192, 512]) {
  const browser = await puppeteer.launch({
    executablePath: browserPath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })
  const page = await browser.newPage()
  await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 })
  await page.setContent(`<!DOCTYPE html>
<html><head><style>*{margin:0;padding:0;overflow:hidden;}body{background:transparent;}svg{width:${size}px;height:${size}px;display:block;}</style></head>
<body>${svgContent}</body></html>`, { waitUntil: 'networkidle0' })
  const buf = await page.screenshot({
    type: 'png',
    clip: { x: 0, y: 0, width: size, height: size },
    omitBackground: false,
  })
  const outPath = `${outDir}/pwa-${size}x${size}.png`
  writeFileSync(outPath, buf)
  console.log(`wrote ${outPath} (${buf.length} bytes)`)
  await browser.close()
}
console.log('Done.')
