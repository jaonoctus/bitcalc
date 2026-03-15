import type { PriceProvider } from './types'

export const coinbaseProvider: PriceProvider = {
  name: 'coinbase',

  async fetchPrices(currencies: string[]): Promise<Record<string, number>> {
    const results = await Promise.all(
      currencies.map(async (currency) => {
        const res = await fetch(`https://api.coinbase.com/v2/prices/BTC-${currency}/spot`)
        if (!res.ok) throw new Error(`Coinbase: failed to fetch BTC-${currency} (${res.status})`)
        const json = await res.json() as { data: { amount: string } }
        return [currency, parseFloat(json.data.amount)] as const
      }),
    )
    return Object.fromEntries(results)
  },
}
