import type { PricesResponse } from '~/server/utils/providers/types'

const CACHE_KEY = 'bitcalc:prices'
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

interface PriceCache {
  data: PricesResponse
  cachedAt: number
}

function readCache(): PriceCache | null {
  if (!import.meta.client) return null
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? (JSON.parse(raw) as PriceCache) : null
  }
  catch { return null }
}

function writeCache(data: PricesResponse): void {
  if (!import.meta.client) return
  localStorage.setItem(CACHE_KEY, JSON.stringify({ data, cachedAt: Date.now() }))
}

export function usePrices() {
  const data = ref<PricesResponse | null>(null)

  async function fetch() {
    const fresh = await $fetch<PricesResponse>('/api/prices')
    writeCache(fresh)
    data.value = fresh
  }

  let _timeout: ReturnType<typeof setTimeout> | null = null
  let _interval: ReturnType<typeof setInterval> | null = null

  onMounted(async () => {
    const cache = readCache()
    const age = cache ? Date.now() - new Date(cache.data.fetchedAt).getTime() : Infinity

    if (cache && age < CACHE_TTL) {
      data.value = cache.data
      // schedule next fetch at the remaining TTL so it lines up with expiry
      _timeout = setTimeout(async () => {
        await fetch()
        _interval = setInterval(fetch, CACHE_TTL)
      }, CACHE_TTL - age)
    }
    else {
      await fetch()
      _interval = setInterval(fetch, CACHE_TTL)
    }
  })

  onUnmounted(() => {
    if (_timeout) clearTimeout(_timeout)
    if (_interval) clearInterval(_interval)
  })

  return { data }
}
