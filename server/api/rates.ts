import { Redis } from '@upstash/redis'

type Rate = {
  name: string,
  unit: string,
  value: number,
  type: 'fiat' | 'crypto'
}

type Rates = {
  brl: Rate,
  sats: Rate
}

type CoingeckoResponse = {
  rates: Rates
}

export const coingeckoURL = 'https://api.coingecko.com/api/v3/exchange_rates'

export default defineEventHandler(async (event) => {
  let rates
  let updatedAt

  const redis = Redis.fromEnv()
  const cachedResponse = await redis.get<{ rates: Rates, updatedAt: any }>('rates')

  if (cachedResponse) {
    rates = cachedResponse.rates
    updatedAt = new Date(cachedResponse.updatedAt)
  } else {
    const response = await $fetch<CoingeckoResponse>(coingeckoURL)
    rates = response.rates
    updatedAt = new Date()

    await redis.set('rates', { rates, updatedAt }, {
      ex: 15*60 // 15 minutes
    })
  }

  return {
    rates,
    updatedAt
  }
})
