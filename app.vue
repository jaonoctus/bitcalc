<script lang="ts" setup>
useHead({
  title: 'Bitcoin Price',
  htmlAttrs: {
    class: 'h-100'
  },
  bodyAttrs: {
    class: 'h-100'
  }
})

type Rate = {
  name: string,
  unit: string,
  value: number,
  type: 'fiat' | 'crypto'
}

type CoingeckoResponse = {
  rates: {
    brl: Rate,
    sats: Rate
  }
}

const { coingeckoURL } = useAppConfig()
const { data } = await useFetch<CoingeckoResponse>(coingeckoURL)
const rates = data.value?.rates

const fiatDigits = ref<Number[]>([])
const sats = ref(0)

const fiatNumber = computed(() => {
  const digits = fiatDigits.value
  if (digits.length === 0) {
    return 0
  }
  return Number(digits.join(''))
})

const fiat = computed(() => {
  return `${fiatNumber.value}`
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
  'C',
  '0',
  '<',
]

function updateNumber (key: string) {
  if (key === 'C') {
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
    sats.value = 0
    return
  }

  if (rates) {
    sats.value = Math.round(fiatNumber.value / rates.brl.value * rates.sats.value)
  }
}

function onKey (key: string) {
  updateNumber(key)
  updatePrice()
}
</script>

<template>
  <main class="grid h-screen place-items-center bg-slate-900 py-24 px-6 sm:py-32 lg:px-8">
    <form class="text-white">
      <div class="text-center">
        <div>SATS</div>
        <div>{{ sats }}</div>
      </div>
      <div class="text-center">
        <div>BRL</div>
        <div>{{ fiat }}</div>
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
