import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'
import { createPage, setup, url } from '@nuxt/test-utils/e2e'
import { chromium } from 'playwright-core'
import type { Page } from 'playwright-core'

// ─── Mock prices ──────────────────────────────────────────────────────────────
// 1 BTC = $100,000 USD / €90,000 EUR (round numbers for easy mental math)
const MOCK_PRICES = {
  provider: 'test',
  prices: {
    USD: 100_000,
    EUR: 90_000,
    BRL: 500_000,
    AED: 367_000,
    PYG: 750_000_000,
    INR: 8_300_000,
    ILS: 370_000,
  },
  fetchedAt: new Date().toISOString(),
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
/** Create a fresh page with the prices API mocked. Returns the page and a
 *  getter for how many times the API endpoint was actually called. */
async function newPage(path = '/'): Promise<{ page: Page, apiCalls: () => number }> {
  let callCount = 0
  const page = await createPage()

  // Intercept /api/prices before navigating so the first mount is covered.
  await page.route('**/api/prices', (route) => {
    callCount++
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_PRICES),
    })
  })

  await page.goto(url(path))
  await page.waitForLoadState('networkidle')

  return { page, apiCalls: () => callCount }
}

/** Click a button by its visible text (exact match). */
function btn(page: Page, name: string) {
  return page.getByRole('button', { name, exact: true })
}

/** Read the value of an input[data-testid=...] element. */
async function inputVal(page: Page, testId: string): Promise<string> {
  return page.locator(`[data-testid="${testId}"]`).inputValue()
}

/** Read the text content of an element[data-testid=...]. */
async function text(page: Page, testId: string): Promise<string> {
  return (await page.locator(`[data-testid="${testId}"]`).textContent()) ?? ''
}

// Stable selectors via data-testid attributes
const SEL = {
  btcDisplay: '[data-testid="btc-display"]',
  fiatDisplay: '[data-testid="fiat-display"]',
  unitToggle: '[data-testid="unit-toggle"]',
  backspace: '[data-testid="btn-backspace"]',
  priceDisplay: '[data-testid="price-display"]',
  currencySelect: 'select',
}

// ─── Suite ────────────────────────────────────────────────────────────────────
describe('bitcalc e2e', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('../..', import.meta.url)),
    browser: true,
    browserOptions: {
      type: 'chromium',
      launch: { executablePath: chromium.executablePath() },
    },
  })

  // ── Initial state ──────────────────────────────────────────────────────────
  test('page loads with empty calculator', async () => {
    const { page } = await newPage()
    expect(await inputVal(page, 'btc-display')).toBe('0')
    expect(await inputVal(page, 'fiat-display')).toBe('$0.00')
    await page.close()
  })

  test('price is displayed in footer', async () => {
    const { page } = await newPage()
    expect(await text(page, 'price-display')).toContain('$100,000')
    await page.close()
  })

  test('unit toggle shows SAT by default', async () => {
    const { page } = await newPage()
    expect(await text(page, 'unit-toggle')).toContain('SAT')
    await page.close()
  })

  // ── Basic input ────────────────────────────────────────────────────────────
  test('clicking digit buttons builds expression', async () => {
    const { page } = await newPage()
    await btn(page, '1').click()
    await btn(page, '2').click()
    await btn(page, '3').click()
    expect(await inputVal(page, 'btc-display')).toBe('123')
    await page.close()
  })

  test('clear button resets display to zero', async () => {
    const { page } = await newPage()
    await btn(page, '1').click()
    await btn(page, '2').click()
    await btn(page, '3').click()
    await btn(page, 'C').click()
    expect(await inputVal(page, 'btc-display')).toBe('0')
    expect(await inputVal(page, 'fiat-display')).toBe('$0.00')
    await page.close()
  })

  test('backspace removes last digit', async () => {
    const { page } = await newPage()
    await btn(page, '1').click()
    await btn(page, '2').click()
    await btn(page, '3').click()
    await page.locator(SEL.backspace).click()
    expect(await inputVal(page, 'btc-display')).toBe('12')
    await page.close()
  })

  // ── Math in SAT mode ───────────────────────────────────────────────────────
  // Price: $100,000 / BTC → 1 sat = $0.001

  test('SAT addition: 100 + 200 = 300 sats → $0.30', async () => {
    const { page } = await newPage()
    await btn(page, '1').click()
    await btn(page, '0').click()
    await btn(page, '0').click()
    await btn(page, '+').click()
    await btn(page, '2').click()
    await btn(page, '0').click()
    await btn(page, '0').click()
    await btn(page, '=').click()
    expect(await inputVal(page, 'btc-display')).toBe('300')
    expect(await inputVal(page, 'fiat-display')).toBe('$0.30')
    await page.close()
  })

  test('SAT multiplication: 1000 × 2 = 2,000 sats → $2.00', async () => {
    const { page } = await newPage()
    await btn(page, '1').click()
    await btn(page, '0').click()
    await btn(page, '0').click()
    await btn(page, '0').click()
    await btn(page, '×').click()
    await btn(page, '2').click()
    await btn(page, '=').click()
    expect(await inputVal(page, 'btc-display')).toBe('2,000')
    expect(await inputVal(page, 'fiat-display')).toBe('$2.00')
    await page.close()
  })

  test('SAT division: 1000 ÷ 4 = 250 sats → $0.25', async () => {
    const { page } = await newPage()
    await btn(page, '1').click()
    await btn(page, '0').click()
    await btn(page, '0').click()
    await btn(page, '0').click()
    await btn(page, '÷').click()
    await btn(page, '4').click()
    await btn(page, '=').click()
    expect(await inputVal(page, 'btc-display')).toBe('250')
    expect(await inputVal(page, 'fiat-display')).toBe('$0.25')
    await page.close()
  })

  test('SAT subtraction: 500 − 200 = 300 sats → $0.30', async () => {
    const { page } = await newPage()
    await btn(page, '5').click()
    await btn(page, '0').click()
    await btn(page, '0').click()
    await btn(page, '−').click()
    await btn(page, '2').click()
    await btn(page, '0').click()
    await btn(page, '0').click()
    await btn(page, '=').click()
    expect(await inputVal(page, 'btc-display')).toBe('300')
    expect(await inputVal(page, 'fiat-display')).toBe('$0.30')
    await page.close()
  })

  test('SAT with parentheses: (100+200)×3 = 900 sats → $0.90', async () => {
    const { page } = await newPage()
    await btn(page, '( )').click() // open paren
    await btn(page, '1').click()
    await btn(page, '0').click()
    await btn(page, '0').click()
    await btn(page, '+').click()
    await btn(page, '2').click()
    await btn(page, '0').click()
    await btn(page, '0').click()
    await btn(page, '( )').click() // close paren
    await btn(page, '×').click()
    await btn(page, '3').click()
    await btn(page, '=').click()
    expect(await inputVal(page, 'btc-display')).toBe('900')
    expect(await inputVal(page, 'fiat-display')).toBe('$0.90')
    await page.close()
  })

  test('large SAT amount shows comma-separated display', async () => {
    const { page } = await newPage()
    // 100,000 sats = $100.00
    await btn(page, '1').click()
    await btn(page, '0').click()
    await btn(page, '0').click()
    await btn(page, '0').click()
    await btn(page, '0').click()
    await btn(page, '0').click()
    expect(await inputVal(page, 'btc-display')).toBe('100,000')
    expect(await inputVal(page, 'fiat-display')).toBe('$100.00')
    await page.close()
  })

  // ── SAT ↔ BTC unit toggle ──────────────────────────────────────────────────
  test('switches from SAT to BTC: 100 sats → 0.000001 BTC', async () => {
    const { page } = await newPage()
    await btn(page, '1').click()
    await btn(page, '0').click()
    await btn(page, '0').click()
    await page.locator(SEL.unitToggle).click()
    expect(await text(page, 'unit-toggle')).toContain('BTC')
    expect(await inputVal(page, 'btc-display')).toBe('0.000001')
    await page.close()
  })

  test('switches from BTC to SAT: 1 BTC → 100,000,000 sats', async () => {
    const { page } = await newPage()
    await page.locator(SEL.unitToggle).click() // SAT → BTC
    await btn(page, '1').click()
    // fiat equivalent
    expect(await inputVal(page, 'fiat-display')).toBe('$100,000.00')
    // switch back to SAT
    await page.locator(SEL.unitToggle).click()
    expect(await text(page, 'unit-toggle')).toContain('SAT')
    expect(await inputVal(page, 'btc-display')).toBe('100,000,000')
    expect(await inputVal(page, 'fiat-display')).toBe('$100,000.00')
    await page.close()
  })

  test('math in BTC mode: 0.5 BTC → $50,000.00', async () => {
    const { page } = await newPage()
    await page.locator(SEL.unitToggle).click() // SAT → BTC
    await btn(page, '0').click()
    await btn(page, '.').click()
    await btn(page, '5').click()
    expect(await inputVal(page, 'fiat-display')).toBe('$50,000.00')
    await page.close()
  })

  test('math in BTC mode: 0.1 + 0.2 = 0.3 BTC → $30,000.00', async () => {
    const { page } = await newPage()
    await page.locator(SEL.unitToggle).click() // SAT → BTC
    await btn(page, '0').click()
    await btn(page, '.').click()
    await btn(page, '1').click()
    await btn(page, '+').click()
    await btn(page, '0').click()
    await btn(page, '.').click()
    await btn(page, '2').click()
    await btn(page, '=').click()
    expect(await inputVal(page, 'fiat-display')).toBe('$30,000.00')
    await page.close()
  })

  // ── Fiat field ─────────────────────────────────────────────────────────────
  test('activating fiat field converts SAT amount to fiat', async () => {
    const { page } = await newPage()
    // 10,000 sats = $10.00
    await btn(page, '1').click()
    await btn(page, '0').click()
    await btn(page, '0').click()
    await btn(page, '0').click()
    await btn(page, '0').click()
    // click fiat display to activate fiat field
    await page.locator(SEL.fiatDisplay).click({ force: true })
    expect(await inputVal(page, 'fiat-display')).toBe('$10.00')
    expect(await inputVal(page, 'btc-display')).toBe('10,000')
    await page.close()
  })

  test('math in fiat mode: $1,000 → 1,000,000 sats', async () => {
    const { page } = await newPage()
    // activate fiat
    await page.locator(SEL.fiatDisplay).click({ force: true })
    await btn(page, '1').click()
    await btn(page, '0').click()
    await btn(page, '0').click()
    await btn(page, '0').click()
    expect(await inputVal(page, 'fiat-display')).toBe('$1,000.00')
    // $1,000 / $100,000 * 100,000,000 = 1,000,000 sats
    expect(await inputVal(page, 'btc-display')).toBe('1,000,000')
    await page.close()
  })

  test('fiat addition: $500 + $500 = $1,000 → 1,000,000 sats', async () => {
    const { page } = await newPage()
    await page.locator(SEL.fiatDisplay).click({ force: true })
    await btn(page, '5').click()
    await btn(page, '0').click()
    await btn(page, '0').click()
    await btn(page, '+').click()
    await btn(page, '5').click()
    await btn(page, '0').click()
    await btn(page, '0').click()
    await btn(page, '=').click()
    expect(await inputVal(page, 'fiat-display')).toBe('$1,000.00')
    expect(await inputVal(page, 'btc-display')).toBe('1,000,000')
    await page.close()
  })

  test('fiat multiplication: $200 × 3 = $600 → 600,000 sats', async () => {
    const { page } = await newPage()
    await page.locator(SEL.fiatDisplay).click({ force: true })
    await btn(page, '2').click()
    await btn(page, '0').click()
    await btn(page, '0').click()
    await btn(page, '×').click()
    await btn(page, '3').click()
    await btn(page, '=').click()
    expect(await inputVal(page, 'fiat-display')).toBe('$600.00')
    expect(await inputVal(page, 'btc-display')).toBe('600,000')
    await page.close()
  })

  test('switching back from fiat to BTC restores original SAT expression', async () => {
    const { page } = await newPage()
    // enter 100,000 sats
    await btn(page, '1').click()
    await btn(page, '0').click()
    await btn(page, '0').click()
    await btn(page, '0').click()
    await btn(page, '0').click()
    await btn(page, '0').click()
    // switch to fiat → expression becomes "100" ($100)
    await page.locator(SEL.fiatDisplay).click({ force: true })
    expect(await inputVal(page, 'fiat-display')).toBe('$100.00')
    // switch back to BTC without editing → original "100000" sats restored
    await page.locator(SEL.btcDisplay).click({ force: true })
    expect(await inputVal(page, 'btc-display')).toBe('100,000')
    await page.close()
  })

  // ── Currency switching ─────────────────────────────────────────────────────
  test('switching to EUR updates price display', async () => {
    const { page } = await newPage()
    await page.locator(SEL.currencySelect).selectOption('EUR')
    expect(await text(page, 'price-display')).toContain('€90,000')
    await page.close()
  })

  test('EUR conversion: 100,000 sats → €90.00', async () => {
    const { page } = await newPage()
    await page.locator(SEL.currencySelect).selectOption('EUR')
    await btn(page, '1').click()
    await btn(page, '0').click()
    await btn(page, '0').click()
    await btn(page, '0').click()
    await btn(page, '0').click()
    await btn(page, '0').click()
    // 100,000 / 1e8 * 90,000 = 0.001 * 90,000 = €90
    expect(await inputVal(page, 'fiat-display')).toBe('€90.00')
    await page.close()
  })

  test('EUR fiat mode: €900 → 1,000,000 sats', async () => {
    const { page } = await newPage()
    await page.locator(SEL.currencySelect).selectOption('EUR')
    await page.locator(SEL.fiatDisplay).click({ force: true })
    await btn(page, '9').click()
    await btn(page, '0').click()
    await btn(page, '0').click()
    // €900 / €90,000 * 1e8 = 0.01 BTC = 1,000,000 sats
    expect(await inputVal(page, 'fiat-display')).toBe('€900.00')
    expect(await inputVal(page, 'btc-display')).toBe('1,000,000')
    await page.close()
  })

  test('currency selection is persisted in localStorage', async () => {
    const { page } = await newPage()
    await page.locator(SEL.currencySelect).selectOption('BRL')
    const stored = await page.evaluate(() => localStorage.getItem('bitcalc:currency'))
    expect(stored).toBe('BRL')
    await page.close()
  })

  // ── API mock + cache ───────────────────────────────────────────────────────
  test('prices API is called once on first load', async () => {
    const { page, apiCalls } = await newPage()
    expect(apiCalls()).toBe(1)
    await page.close()
  })

  test('fetched prices are written to localStorage cache', async () => {
    const { page } = await newPage()
    const raw = await page.evaluate(() => localStorage.getItem('bitcalc:prices'))
    expect(raw).not.toBeNull()
    const cache = JSON.parse(raw!)
    expect(cache.data.prices.USD).toBe(100_000)
    expect(cache.data.provider).toBe('test')
    await page.close()
  })

  test('second page load within TTL uses cache and skips API', async () => {
    const { page, apiCalls } = await newPage()
    // First load called the API
    expect(apiCalls()).toBe(1)

    // Navigate to same page again — localStorage cache is still fresh
    await page.goto(url('/'))
    await page.waitForLoadState('networkidle')

    // API must NOT have been called a second time
    expect(apiCalls()).toBe(1)

    // Prices still show correctly (served from cache)
    expect(await text(page, 'price-display')).toContain('$100,000')
    await page.close()
  })

  test('stale cache triggers a fresh API call', async () => {
    const { page, apiCalls } = await newPage()
    // First load
    expect(apiCalls()).toBe(1)

    // Poison localStorage with an old fetchedAt (6 minutes ago) to simulate stale cache
    await page.evaluate(() => {
      const stale = {
        data: {
          provider: 'test',
          prices: { USD: 100_000, EUR: 90_000, BRL: 500_000, AED: 367_000, PYG: 750_000_000, INR: 8_300_000, ILS: 370_000 },
          fetchedAt: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
        },
        cachedAt: Date.now() - 6 * 60 * 1000,
      }
      localStorage.setItem('bitcalc:prices', JSON.stringify(stale))
    })

    await page.goto(url('/'))
    await page.waitForLoadState('networkidle')

    // Stale cache should have caused a fresh API fetch
    expect(apiCalls()).toBe(2)
    await page.close()
  })
})
