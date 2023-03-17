<script lang="ts" setup>
import BigNumber from 'bignumber.js'
import relativeTime from 'dayjs/plugin/relativeTime'
import dayjs from 'dayjs'

BigNumber.config({
  ROUNDING_MODE: BigNumber.ROUND_DOWN
})

useHead({
  title: 'Bitcoin Price',
  htmlAttrs: {
    class: 'h-100'
  },
  bodyAttrs: {
    class: 'h-100 bg-slate-900'
  }
})

const apiRatesData = ref<any>(null)
const isLoading = ref(true)
const hasError = ref(false)
const rates = computed(() => {
  if (!apiRatesData.value) return null
  return apiRatesData.value.rates
})
dayjs.extend(relativeTime)
const updatedAt = ref()

const isTypingInFiat = ref(false)

const inputDigits = ref<Number[]>([])
const inputNumber = computed(() => {
  const digits = inputDigits.value
  if (digits.length === 0) {
    return 0
  }
  return Number(digits.join(''))
})

const isSats = ref(true)
const fiatNumber = ref(0)
const fiat = computed(() => {
  return fiatNumber.value.toLocaleString(undefined, { maximumFractionDigits: 2 })
})
const satsNumber = ref(0)
const sats = computed(() => {
  const maximumFractionDigits = isSats.value ? 0 : 8
  const minimumFractionDigits = isSats.value ? 0 : 8
  return satsNumber.value.toLocaleString(undefined, { maximumFractionDigits, minimumFractionDigits })
})

const currency = ref('brl')
const currencies = ['brl', 'usd', 'eur']
const currencySymbol = computed(() => {
  if (!rates.value) return ''
  if (!rates.value[currency.value]) return ''
  return rates.value[currency.value].unit
})

const keypad = [
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  'c',
  '0',
  '<',
]

function updateNumber (key: string) {
  if (key === 'c') {
    inputDigits.value = []
    return
  }

  if (key === '<') {
    inputDigits.value.pop()
    return
  }

  inputDigits.value.push(Number(key))
}

function updatePrice () {
  if (inputNumber.value === 0) {
    satsNumber.value = 0
    fiatNumber.value = 0
    return
  }

  if (rates.value) {
    const fiatPrice = new BigNumber(rates.value[currency.value].value)

    if (isTypingInFiat.value) {
      fiatNumber.value = inputNumber.value
      const fiatValue = new BigNumber(fiatNumber.value)
      let satsValue = fiatValue.dividedBy(fiatPrice).decimalPlaces(8)

      if (isSats.value) {
        satsValue = satsValue.times(1e8)
      }

      satsNumber.value = satsValue.toNumber()
    } else {
      let satsValue = new BigNumber(inputNumber.value)

      if (!isSats.value) {
        satsValue = satsValue.dividedBy(1e8)
      }

      satsNumber.value = satsValue.toNumber()
      const bitcoinNumber = new BigNumber(inputNumber.value).dividedBy(1e8)
      fiatNumber.value = fiatPrice.times(bitcoinNumber).toNumber()
    }
  }
}

function onKey (key: string) {
  updateNumber(key)
  updatePrice()
}

function toggleSats() {
  isSats.value = !isSats.value
  updatePrice()
}

function toggleCurrency(c: string) {
  currency.value = c
  updatePrice()
}

async function fetchRates() {
  if (process.client) {
    const localCache = window.localStorage.getItem('rates')
    if (localCache) {
      const parsedCache = JSON.parse(localCache)

      if (parsedCache) {
        if (dayjs(parsedCache.updatedAt).diff(new Date(), 'm') > -15) {
          apiRatesData.value = parsedCache
          updatedAt.value = dayjs(parsedCache.updatedAt).fromNow()
          isLoading.value = false
          hasError.value = false
          return
        }
      }
    }

    const { data, pending, error } = await useFetch('/api/rates')
    apiRatesData.value = data.value
    updatedAt.value = dayjs(apiRatesData.value?.updatedAt).fromNow()
    isLoading.value = pending.value
    hasError.value = !!error.value

    window.localStorage.setItem('rates', JSON.stringify(apiRatesData.value))
  }
}

function listenKeyboard() {
  window.addEventListener('keyup', (event: KeyboardEvent) => {
    let key = event.key

    if (key === 'Backspace') {
      key = '<'
    }

    if (keypad.includes(key.toLowerCase())) {
      onKey(key)
    }
  })
}

function listenClipboard() {
  window.addEventListener('paste', (event) => {
    event.preventDefault()

    const { clipboardData } = event as ClipboardEvent

    if (clipboardData) {
      const text = clipboardData.getData('text')
      satsNumber.value = 0
      fiatNumber.value = 0
      inputDigits.value = []
      text.split('').forEach(onKey)
    }
  })
}

onMounted(async () => {
  listenKeyboard()
  listenClipboard()

  setInterval(() => {
    updatedAt.value = dayjs(apiRatesData.value?.updatedAt).fromNow()
  }, 60000)

  await fetchRates()
})
</script>

<template>
  <main
    v-if="!isLoading"
    class="grid h-screen place-items-center bg-slate-900 py-24 px-6 sm:py-32 lg:px-8"
  >
    <div v-if="hasError">
      <h1 class="text-white">Couldn't fetch bitcoin rates atm. Come back later.</h1>
    </div>
    <div v-else>
      <form class="text-white">
      <div class="text-center mb-4">
        <div class="flex justify-center gap-2 mb-4">
          <button
            :class="{ 'bg-orange-400 text-slate-900 border-slate-700': isSats }"
            @click.prevent="toggleSats"
            class="px-4 border rounded-full"
          >
            SATS
          </button>
          <button
            :class="{ 'bg-orange-400 text-slate-900 border-slate-700': !isSats }"
            @click.prevent="toggleSats"
            class="px-4 border rounded-full"
          >
            BTC
        </button>
        </div>
        <div
          :class="{ 'underline': !isTypingInFiat }"
          @click="isTypingInFiat = false; inputDigits = []"
          class="text-3xl cursor-pointer"
        >
          {{ sats }}
        </div>
      </div>
      <div class="text-center mb-4">
        <div class="flex justify-center gap-2 mb-4">
          <button
            v-for="c in currencies"
            :class="{ 'bg-orange-400 text-slate-900 border-slate-700': c === currency }"
            @click.prevent="() => toggleCurrency(c)"
            class="px-4 border rounded-full uppercase"
          >
            {{ c }}
          </button>
        </div>
        <div
          :class="{ 'underline': isTypingInFiat }"
          @click="isTypingInFiat = true; inputDigits = []"
          class="text-3xl cursor-pointer"
        >
          <span>{{ currencySymbol }}</span> {{ fiat }}
        </div>
      </div>
      <div class="keypad">
        <button
          v-for="key in keypad"
          @click.prevent="onKey(key)"
          class="text-white"
        >
          {{ key }}
        </button>
      </div>
    </form>
    <div class="text-center mt-5">
      <p class="text-slate-500 text-sm">last price update: {{ updatedAt }}.<br>(from <a href="https://www.coingecko.com/" target="_blank" class="underline">CoinGecko</a>)</p>
      <p class="text-slate-500 mt-5">made by <a href="https://github.com/jaonoctus/bitcalc" target="_blank" class="font-bold">jaonoctus</a></p>
    </div>
    </div>
  </main>
  <main v-else class="grid h-screen place-items-center bg-slate-900 py-24 px-6 sm:py-32 lg:px-8">
    <h1 class="text-white">loading...</h1>
  </main>
</template>

<style>
.keypad {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
}

.keypad button {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  position: relative;
  min-height: 3.5rem;
  max-height: 6rem;
  border: 1px solid #30363d;
  padding: 1rem 2rem;
}

.keypad button:focus-visible {
  outline: none;
}
</style>
