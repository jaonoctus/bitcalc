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
    class: 'h-100'
  }
})

const {
  data: apiRatesData,
  pending: isLoading,
  error: hasError
} = await useLazyFetch('/api/rates')
const rates = apiRatesData.value?.rates
dayjs.extend(relativeTime)
const updatedAt = ref(dayjs(apiRatesData.value?.updatedAt).fromNow())

const fiatDigits = ref<Number[]>([])
const satsNumber = ref(0)
const isSats = ref(true)

const fiatNumber = computed(() => {
  const digits = fiatDigits.value
  if (digits.length === 0) {
    return 0
  }
  return Number(digits.join(''))
})

const fiat = computed(() => {
  return fiatNumber.value.toLocaleString(undefined, { maximumFractionDigits: 2 })
})

const sats = computed(() => {
  const maximumFractionDigits = isSats.value ? 0 : 8
  return satsNumber.value.toLocaleString(undefined, { maximumFractionDigits })
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
    fiatDigits.value = []
    return
  }

  if (key === '<') {
    fiatDigits.value.pop()
    return
  }

  fiatDigits.value.push(Number(key))
}

function updatePrice () {
  if (fiatNumber.value === 0) {
    satsNumber.value = 0
    return
  }

  if (rates) {
    const fiatValue = new BigNumber(fiatNumber.value)
    const fiatPrice = new BigNumber(rates.brl.value)
    let satsValue = fiatValue.dividedBy(fiatPrice).decimalPlaces(8)

    if (isSats.value) {
      satsValue = satsValue.times(1e8)
    }

    satsNumber.value = satsValue.toNumber()
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

function onInput(event: any) {
  console.log(event)
}

onMounted(() => {
  window.addEventListener('keyup', (event: KeyboardEvent) => {
    let key = event.key

    if (key === 'Backspace') {
      key = '<'
    }

    if (keypad.includes(key.toLowerCase())) {
      onKey(key)
    }
  })

  setInterval(() => {
    console.log('update price')
    updatedAt.value = dayjs(apiRatesData.value?.updatedAt).fromNow()
  }, 60000)
})
</script>

<template>
  <main
    v-if="!isLoading"
    @input.native="onInput"
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
        <div class="text-3xl">{{ sats }}</div>
      </div>
      <div class="text-center mb-4">
        <div>BRL</div>
        <div class="text-3xl">{{ fiat }}</div>
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
    <div class="text-center">
      <span class="text-slate-500 text-sm">last price update: {{ updatedAt }}.</span>
    </div>
    </div>
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
</style>
