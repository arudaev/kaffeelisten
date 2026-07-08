// Shared Chromium/Puppeteer helpers. One browser launch renders many PDFs, so a
// monthly run that attaches a PDF to every email pays the Chromium cold-start
// once instead of per recipient. All rendering is self-contained (inline styles,
// data: images only) — JS is disabled and every non-data request is aborted, so
// crafted names can neither execute nor exfiltrate. Mirrors the hardening in
// report.ts generatePdf.

import type { Browser } from 'puppeteer-core'

export type { Browser }

// The pack version MUST match the installed @sparticuz/chromium-min major
// (package.json → ^147). Bump this URL whenever chromium-min is upgraded.
const CHROMIUM_PACK =
  'https://github.com/Sparticuz/chromium/releases/download/v147.0.0/chromium-v147.0.0-pack.tar'

export async function launchBrowser(): Promise<Browser> {
  const chromium = (await import('@sparticuz/chromium-min')).default
  const puppeteer = (await import('puppeteer-core')).default
  const executablePath = process.env.CHROMIUM_PATH ?? (await chromium.executablePath(CHROMIUM_PACK))
  // Drop --disable-web-security: the HTML is fully self-contained, so relaxing
  // same-origin only widens the attack surface. --no-sandbox stays (required in
  // the serverless runtime; not what defends against injection).
  const safeArgs = chromium.args.filter(a => !a.startsWith('--disable-web-security'))
  return puppeteer.launch({ args: safeArgs, executablePath, headless: true })
}

// Render one self-contained HTML string to a PDF buffer on an existing browser.
export async function pageToPdf(
  browser: Browser,
  html: string,
  opts: { margin?: { top: string; right: string; bottom: string; left: string } } = {},
): Promise<Buffer> {
  const page = await browser.newPage()
  try {
    await page.setJavaScriptEnabled(false)
    await page.setRequestInterception(true)
    page.on('request', req => {
      const url = req.url()
      if (url.startsWith('data:') || url.startsWith('about:')) req.continue()
      else req.abort()
    })
    await page.setContent(html, { waitUntil: 'load' })
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: opts.margin ?? { top: '0', right: '0', bottom: '0', left: '0' },
    })
    return Buffer.from(pdf)
  } finally {
    await page.close()
  }
}
