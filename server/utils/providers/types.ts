export interface PriceProvider {
  name: string
  fetchPrices(currencies: string[]): Promise<Record<string, number>>
}

export interface PricesResponse {
  provider: string
  prices: Record<string, number>
  fetchedAt: string
}
