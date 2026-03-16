import { coinbaseProvider } from '../utils/providers/coinbase'
import type { PricesResponse } from '../utils/providers/types'
import { cacheGet, cacheSet } from '../utils/cache'

const CURRENCIES = ['AED', 'BRL', 'EUR', 'ILS', 'INR', 'PYG', 'USD']
const CACHE_KEY = 'bitcalc:prices'
const CACHE_TTL = 5 * 60 // 5 minutes in seconds

export default defineEventHandler(async (): Promise<PricesResponse> => {
  const cached = await cacheGet<PricesResponse>(CACHE_KEY)
  if (cached) return cached

  const provider = coinbaseProvider
  const prices = await provider.fetchPrices(CURRENCIES)
  const response: PricesResponse = {
    provider: provider.name,
    prices,
    fetchedAt: new Date().toISOString(),
  }

  await cacheSet(CACHE_KEY, response, CACHE_TTL)
  return response
})
