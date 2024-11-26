import { Redis } from '@upstash/redis'
import {DateTime, Duration} from 'luxon'

enum CACHE_KEYS {
    RATES = 'rates'
}

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
    let rates = null
    let updatedAt = null

    const redis = Redis.fromEnv()

    try {
        const cachedResponse = await redis.get<{ rates: Rates, updatedAt: string }>('rates')

        if (cachedResponse) {
            rates = cachedResponse.rates
            updatedAt = DateTime.fromISO(cachedResponse.updatedAt)
        } else {
            const response = await $fetch<CoingeckoResponse>(coingeckoURL)
            rates = response.rates
            updatedAt = DateTime.now().toISO()

            await redis.set('rates', { rates, updatedAt }, {
                ex: Duration.fromObject({ minutes: 5 }).as('seconds')
            })
        }
    } catch (error) {
        console.log('Error fetching rates')
        console.error(error)
    }

    // if (cachedResponse) {
    //     rates = cachedResponse.rates
    //     updatedAt = new Date(cachedResponse.updatedAt)
    // } else {
    //     const response = await $fetch<CoingeckoResponse>(coingeckoURL)
    //     rates = response.rates
    //     updatedAt = DateTime.now().toISO()
    //
    //     await redis.set('rates', { rates, updatedAt }, {
    //         ex: 15*60 // 15 minutes
    //     })
    // }

    return {
        rates,
        updatedAt
    }
})
