import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { defineComponent } from 'vue'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'

const CACHE_KEY = 'bitcalc:prices'

const mockResponse = {
  provider: 'coinbase',
  prices: { USD: 50000 },
  fetchedAt: new Date().toISOString(),
}

const TestComponent = defineComponent({
  setup: () => usePrices(),
  template: '<div />',
})

describe('usePrices', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllTimers()
  })

  it('fetches prices on mount when there is no cache', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue(mockResponse))

    const wrapper = await mountSuspended(TestComponent)
    await flushPromises()

    expect($fetch).toHaveBeenCalledWith('/api/prices')
    expect(wrapper.vm.data).toMatchObject({ prices: { USD: 50000 } })
  })

  it('writes the response to localStorage cache', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue(mockResponse))

    await mountSuspended(TestComponent)
    await flushPromises()

    const raw = localStorage.getItem(CACHE_KEY)
    expect(raw).not.toBeNull()
    const cached = JSON.parse(raw!)
    expect(cached.data.prices.USD).toBe(50000)
    expect(cached.cachedAt).toBeTypeOf('number')
  })

  it('uses cached data and skips fetch when cache is fresh', async () => {
    const cachedData = { ...mockResponse, prices: { USD: 45000 } }
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ data: cachedData, cachedAt: Date.now() }),
    )

    const mockFetch = vi.fn()
    vi.stubGlobal('$fetch', mockFetch)

    const wrapper = await mountSuspended(TestComponent)
    await flushPromises()

    expect(mockFetch).not.toHaveBeenCalled()
    expect(wrapper.vm.data).toMatchObject({ prices: { USD: 45000 } })
  })

  it('fetches fresh data when cache is stale (> 5 min old)', async () => {
    const staleTime = new Date(Date.now() - 6 * 60 * 1000).toISOString()
    const staleData = { ...mockResponse, prices: { USD: 40000 }, fetchedAt: staleTime }
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ data: staleData, cachedAt: Date.now() - 6 * 60 * 1000 }),
    )

    const freshResponse = { ...mockResponse, prices: { USD: 50000 } }
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue(freshResponse))

    const wrapper = await mountSuspended(TestComponent)
    await flushPromises()

    expect($fetch).toHaveBeenCalledWith('/api/prices')
    expect(wrapper.vm.data).toMatchObject({ prices: { USD: 50000 } })
  })

})
