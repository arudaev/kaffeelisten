// Generates pwa-192x192.png and pwa-512x512.png from logo.svg
// Run from repo root: node tools/generate-icons.mjs

import puppeteer from 'puppeteer-core'
import { writeFileSync, readFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { resolve, dirname } from 'path'

const __dir = dirname(fileURLToPath(import.meta.url))
const logoPath = resolve(__dir, '../apps/web/public/logo.svg')
const outDir   = resolve(__dir, '../apps/web/public')

const CHROME_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
]
const chromePath = CHROME_CANDIDATES.find(p => existsSync(p))
if (!chromePath) { console.error('Chrome not found.'); process.exit(1) }
console.log('Chrome:', chromePath)

const svgContent = readFileSync(logoPath, 'utf8')

for (const size of [192, 512]) {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })
  const page = await browser.newPage()
  await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 })
  await page.setContent(
    `<!DOCTYPE html><html><head><style>*{margin:0;padding:0;overflow:hidden;}svg{width:${size}px;height:${size}px;display:block;}</style></head><body>${svgContent}</body></html>`,
    { waitUntil: 'networkidle0' }
  )
  const buf = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: size, height: size } })
  const out = `${outDir}/pwa-${size}x${size}.png`
  writeFileSync(out, buf)
  console.log(`✓ ${out} (${buf.length} bytes)`)
  await browser.close()
}
console.log('Done.')
