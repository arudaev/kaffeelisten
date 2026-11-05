import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { emailLogoUrl, publicBaseUrl } from '../api/_lib/publicUrl'

const KEY = 'PUBLIC_BASE_URL'

describe('publicBaseUrl', () => {
  let saved: string | undefined

  beforeEach(() => {
    saved = process.env[KEY]
    delete process.env[KEY]
  })

  afterEach(() => {
    if (saved === undefined) delete process.env[KEY]
    else process.env[KEY] = saved
  })

  it('falls back to the apex, so an unconfigured deployment behaves as before', () => {
    expect(publicBaseUrl()).toBe('https://kaffeelisten.de')
    expect(emailLogoUrl()).toBe('https://kaffeelisten.de/email-logo.png')
  })

  it('uses the configured origin, so an instance points at itself', () => {
    process.env[KEY] = 'https://itc1.kaffeelisten.de'
    expect(publicBaseUrl()).toBe('https://itc1.kaffeelisten.de')
    expect(emailLogoUrl()).toBe('https://itc1.kaffeelisten.de/email-logo.png')
  })

  it('normalises a trailing slash, a path and surrounding whitespace', () => {
    process.env[KEY] = '  https://demo.kaffeelisten.de/some/path/  '
    expect(publicBaseUrl()).toBe('https://demo.kaffeelisten.de')
  })

  it('assumes https when the scheme is left off', () => {
    process.env[KEY] = 'itc1.kaffeelisten.de'
    expect(publicBaseUrl()).toBe('https://itc1.kaffeelisten.de')
  })

  it('falls back rather than emitting a broken URL when the value is unparseable', () => {
    process.env[KEY] = 'http://'
    expect(publicBaseUrl()).toBe('https://kaffeelisten.de')
  })

  it('treats an empty or blank value as unset', () => {
    process.env[KEY] = '   '
    expect(publicBaseUrl()).toBe('https://kaffeelisten.de')
  })
})
