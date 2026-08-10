import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { defineComponent } from 'vue'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'

const CACHE_KEY = 'bitcalc:prices'

const mockResponse = {
  provider: 'coinbase',
  prices: { USD: 50000 },
  fetchedAt: new Date().toISOString(),
}

// $fetch is a Nuxt auto-import, so it can't be swapped with vi.stubGlobal —
// mock the endpoint it hits instead.
const pricesHandler = vi.fn(() => mockResponse)
registerEndpoint('/api/prices', pricesHandler)

const TestComponent = defineComponent({
  setup: () => usePrices(),
  template: '<div />',
})

describe('usePrices', () => {
  beforeEach(() => {
    localStorage.clear()
    pricesHandler.mockClear()
    pricesHandler.mockReturnValue(mockResponse)
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  it('fetches prices on mount when there is no cache', async () => {
    const wrapper = await mountSuspended(TestComponent)
    await flushPromises()

    expect(pricesHandler).toHaveBeenCalledTimes(1)
    expect(wrapper.vm.data).toMatchObject({ prices: { USD: 50000 } })
  })

  it('writes the response to localStorage cache', async () => {
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

    const wrapper = await mountSuspended(TestComponent)
    await flushPromises()

    expect(pricesHandler).not.toHaveBeenCalled()
    expect(wrapper.vm.data).toMatchObject({ prices: { USD: 45000 } })
  })

  it('fetches fresh data when cache is stale (> 5 min old)', async () => {
    const staleTime = new Date(Date.now() - 6 * 60 * 1000).toISOString()
    const staleData = { ...mockResponse, prices: { USD: 40000 }, fetchedAt: staleTime }
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ data: staleData, cachedAt: Date.now() - 6 * 60 * 1000 }),
    )

    const wrapper = await mountSuspended(TestComponent)
    await flushPromises()

    expect(pricesHandler).toHaveBeenCalledTimes(1)
    expect(wrapper.vm.data).toMatchObject({ prices: { USD: 50000 } })
  })

})
