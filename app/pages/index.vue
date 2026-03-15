<script setup lang="ts">
import { DateTime } from 'luxon'

// ─── Prices ───────────────────────────────────────────────────────────────────
const SYMBOLS: Record<string, string> = { USD: '$', EUR: '€', BRL: 'R$', AED: 'د.إ', PYG: '₲' }
const CURRENCIES = ['AED', 'BRL', 'EUR', 'PYG', 'USD'] as const
type Currency = (typeof CURRENCIES)[number]

const { data: priceData } = usePrices()
const prices = computed(() => priceData.value?.prices ?? {})
const priceUpdatedAt = computed(() =>
  priceData.value?.fetchedAt ? DateTime.fromISO(priceData.value.fetchedAt) : null,
)

// ─── State ───────────────────────────────────────────────────────────────────
const activeField = ref<'btc' | 'fiat'>('btc')
const expression = ref('')
const unit = ref<'sat' | 'btc'>('sat')
const currency = ref<Currency>('USD')
const justEvaluated = ref(false)
const copiedBtc = ref(false)
const copiedFiat = ref(false)
const exprInputRef = ref<HTMLInputElement | null>(null)
const now = ref(DateTime.now())
let _ticker: ReturnType<typeof setInterval>
onMounted(() => { _ticker = setInterval(() => { now.value = DateTime.now() }, 1000) })
onUnmounted(() => clearInterval(_ticker))
const timeAgo = computed(() => {
  if (!priceUpdatedAt.value) return '...'
  const diff = now.value.diff(priceUpdatedAt.value, ['minutes', 'seconds'])
  const mins = Math.floor(diff.minutes)
  const secs = Math.floor(diff.seconds)
  if (mins >= 1) return `${mins} minute${mins > 1 ? 's' : ''} ago`
  return `${secs} second${secs !== 1 ? 's' : ''} ago`
})

// ─── Safe expression evaluator ───────────────────────────────────────────────
function safeEval(expr: string): number | null {
  const clean = expr.trim()
  if (!clean) return null
  if (!/^[\d\s+\-*/().]+$/.test(clean)) return null
  try {
    // eslint-disable-next-line no-new-func
    const result = new Function(`"use strict"; return (${clean})`)()
    if (typeof result !== 'number' || !isFinite(result) || isNaN(result)) return null
    return result
  }
  catch { return null }
}

// ─── Computed values ─────────────────────────────────────────────────────────
const parsedValue = computed(() => safeEval(expression.value))

// BTC amount always in BTC (not sats), derived from whichever field is active
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const btcAmt = computed((): number | null => {
  if (parsedValue.value === null) return null
  if (activeField.value === 'btc')
    return unit.value === 'btc' ? parsedValue.value : parsedValue.value / 1e8
  else
    return parsedValue.value / (prices.value[currency.value] ?? 1)
})

const fiatAmt = computed((): number | null => {
  if (parsedValue.value === null) return null
  if (activeField.value === 'fiat')
    return parsedValue.value
  else {
    if (btcAmt.value === null) return null
    return btcAmt.value * (prices.value[currency.value] ?? 1)
  }
})

// ─── Display formatters ──────────────────────────────────────────────────────
const btcDisplay = computed(() => {
  if (btcAmt.value === null) return '0'
  if (unit.value === 'sat') return Math.round(btcAmt.value * 1e8).toLocaleString('en-US')
  return parseFloat(btcAmt.value.toFixed(8)).toLocaleString('en-US', { maximumFractionDigits: 8 })
})

const fiatDisplay = computed(() => {
  if (fiatAmt.value === null) return `${SYMBOLS[currency.value]}0.00`
  const sym = SYMBOLS[currency.value]
  const v = fiatAmt.value
  if (v === 0) return `${sym}0.00`
  if (Math.abs(v) >= 1e9) return `${sym}${(v / 1e9).toFixed(2)}B`
  if (Math.abs(v) >= 1e6) return `${sym}${(v / 1e6).toFixed(2)}M`
  if (Math.abs(v) > 0 && Math.abs(v) < 0.01) return `< ${sym}0.01`
  return `${sym}${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
})

// ─── Button action handlers ───────────────────────────────────────────────────
function digit(d: string) {
  if (justEvaluated.value) { expression.value = d; justEvaluated.value = false; return }
  expression.value += d
  focusExpr()
}

function operator(op: string) {
  justEvaluated.value = false
  if (!expression.value) return
  const last = expression.value.slice(-1)
  if (['+', '-', '*', '/'].includes(last)) expression.value = expression.value.slice(0, -1)
  expression.value += op
  focusExpr()
}

function decimal() {
  justEvaluated.value = false
  const parts = expression.value.split(/[+\-*/]/)
  if (parts[parts.length - 1].includes('.')) return
  if (!expression.value || /[+\-*/]$/.test(expression.value)) expression.value += '0'
  expression.value += '.'
  focusExpr()
}

function clear() { expression.value = ''; justEvaluated.value = false; focusExpr() }

function backspace() {
  if (justEvaluated.value) { expression.value = ''; justEvaluated.value = false; focusExpr(); return }
  expression.value = expression.value.slice(0, -1)
  focusExpr()
}

function percent() {
  const v = safeEval(expression.value)
  if (v !== null) { expression.value = (v / 100).toString(); justEvaluated.value = true }
}

function toggleSign() {
  const v = safeEval(expression.value)
  if (v !== null) { expression.value = (-v).toString(); justEvaluated.value = true }
}

function equals() {
  const v = safeEval(expression.value)
  if (v !== null) { expression.value = v.toString(); justEvaluated.value = true }
  focusExpr()
}

function focusExpr() {
  nextTick(() => exprInputRef.value?.focus())
}

// ─── Field switching ─────────────────────────────────────────────────────────
function activateBtc() {
  if (activeField.value === 'btc') return
  const fiatRaw = safeEval(expression.value)
  if (fiatRaw !== null) {
    const btcVal = fiatRaw / (prices.value[currency.value] ?? 1)
    expression.value = unit.value === 'sat'
      ? Math.round(btcVal * 1e8).toString()
      : parseFloat(btcVal.toFixed(8)).toString()
    justEvaluated.value = true
  }
  activeField.value = 'btc'
  focusExpr()
}

function activateFiat() {
  if (activeField.value === 'fiat') return
  const btcRaw = safeEval(expression.value)
  if (btcRaw !== null) {
    const btcVal = unit.value === 'btc' ? btcRaw : btcRaw / 1e8
    expression.value = parseFloat((btcVal * (prices.value[currency.value] ?? 1)).toFixed(2)).toString()
    justEvaluated.value = true
  }
  activeField.value = 'fiat'
  focusExpr()
}

// ─── Unit / currency cycling ─────────────────────────────────────────────────
function cycleUnit() {
  if (activeField.value === 'fiat') {
    unit.value = unit.value === 'sat' ? 'btc' : 'sat'
    return
  }
  const v = parsedValue.value
  if (unit.value === 'sat') {
    unit.value = 'btc'
    if (v !== null) { expression.value = parseFloat((v / 1e8).toFixed(8)).toString(); justEvaluated.value = true }
  }
  else {
    unit.value = 'sat'
    if (v !== null) { expression.value = Math.round(v * 1e8).toString(); justEvaluated.value = true }
  }
}

// ─── Clipboard ───────────────────────────────────────────────────────────────
async function copyBtc() {
  if (btcAmt.value === null) return
  const text = unit.value === 'sat'
    ? Math.round(btcAmt.value * 1e8).toString()
    : parseFloat(btcAmt.value.toFixed(8)).toString()
  await navigator.clipboard.writeText(text).catch(() => {})
  copiedBtc.value = true
  setTimeout(() => copiedBtc.value = false, 1500)
}

async function copyFiat() {
  if (fiatAmt.value === null) return
  await navigator.clipboard.writeText(fiatAmt.value.toFixed(2)).catch(() => {})
  copiedFiat.value = true
  setTimeout(() => copiedFiat.value = false, 1500)
}

// ─── Keyboard support ────────────────────────────────────────────────────────
function onExprKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') { e.preventDefault(); equals() }
  if (e.key === 'Escape') { e.preventDefault(); clear() }
}

function onWindowKeydown(e: KeyboardEvent) {
  // Let the expression input handle its own keys
  if (document.activeElement === exprInputRef.value) return
  if (/^[0-9]$/.test(e.key)) { e.preventDefault(); digit(e.key) }
  else if (e.key === '+') { e.preventDefault(); operator('+') }
  else if (e.key === '-') { e.preventDefault(); operator('-') }
  else if (e.key === '*') { e.preventDefault(); operator('*') }
  else if (e.key === '/') { e.preventDefault(); operator('/') }
  else if (e.key === '.') { e.preventDefault(); decimal() }
  else if (e.key === 'Enter' || e.key === '=') { e.preventDefault(); equals() }
  else if (e.key === 'Backspace') { e.preventDefault(); backspace() }
  else if (e.key === 'Escape') { e.preventDefault(); clear() }
  else if (e.key === '%') { e.preventDefault(); percent() }
}

onMounted(() => window.addEventListener('keydown', onWindowKeydown))
onUnmounted(() => window.removeEventListener('keydown', onWindowKeydown))

// ─── Button style helper ──────────────────────────────────────────────────────
function btnCls(type: 'n' | 'op' | 'fn' | 'eq' | 'clr') {
  const base = [
    'flex items-center justify-center h-[68px]',
    'text-[1.25rem] font-mono',
    'cursor-pointer select-none',
    'transition-colors duration-75',
    'active:brightness-75',
    'focus:outline-none',
  ].join(' ')

  const variants: Record<string, string> = {
    n: 'bg-[#171717] hover:bg-[#1f1f1f] text-[#e0dbd2]',
    op: 'bg-[#191208] hover:bg-[#221a0b] text-[#f7931a]',
    fn: 'bg-[#171717] hover:bg-[#1f1f1f] text-[#857870]',
    eq: 'bg-[#f7931a] hover:bg-[#e88510] text-[#1a0f00] font-medium',
    clr: 'bg-[#171717] hover:bg-[#1f1f1f] text-[#f05050]',
  }
  return `${base} ${variants[type]}`
}
</script>

<template>
  <div class="min-h-screen bg-[#080808] flex items-center justify-center p-4">
    <div class="w-full max-w-[360px]">

      <!-- Brand header -->
      <div class="flex items-center justify-between mb-5 px-0.5">
        <div class="flex items-center gap-2.5">
          <span
            class="text-[#f7931a] text-[1.6rem] leading-none font-bold"
            style="text-shadow: 0 0 18px rgba(247,147,26,0.45), 0 0 36px rgba(247,147,26,0.2)"
          >₿</span>
          <span class="font-display text-[#b0a898] text-[0.8rem] font-semibold tracking-[0.24em] uppercase">
            bitcalc
          </span>
        </div>
        <span class="text-[#504840] text-[0.65rem] tracking-widest font-mono">v2</span>
      </div>

      <!-- Calculator panel -->
      <div class="bg-[#0d0d0d] border border-[#1c1c1c] rounded-xl overflow-hidden">

        <!-- ── Display area ───────────────────────────────────────────── -->
        <div class="px-4 pt-5 pb-4 border-b border-[#161616]">

          <!-- Expression input line -->
          <div class="flex items-center justify-end min-h-[1.5rem] mb-1">
            <input
              ref="exprInputRef"
              v-model="expression"
              type="text"
              inputmode="decimal"
              class="flex-1 min-w-0 bg-transparent text-right text-[0.8rem] text-[#6b5e48] focus:text-[#9a8a6e] focus:outline-none placeholder-[#3d3528] tracking-wide font-mono transition-colors"
              :placeholder="activeField === 'btc' ? 'type or use buttons' : 'type fiat or use buttons'"
              autocomplete="off"
              spellcheck="false"
              @keydown="onExprKeydown"
            />
          </div>

          <!-- BTC / SAT result row -->
          <div
            class="flex items-center gap-2 mt-2 cursor-pointer"
            @click="activateBtc"
          >
            <!-- Unit toggle -->
            <button
              class="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#141414] hover:bg-[#1c1c1c] transition-colors"
              @click.stop="cycleUnit"
            >
              <span class="text-[#7a6c5a] text-[0.7rem] font-semibold tracking-widest font-mono">
                {{ unit.toUpperCase() }}
              </span>
              <svg class="w-2 h-2 text-[#504840] mt-px" viewBox="0 0 10 6" fill="none">
                <path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>

            <!-- BTC amount display (selectable input) -->
            <input
              :value="btcDisplay"
              readonly
              class="flex-1 min-w-0 bg-transparent text-right font-mono text-[2rem] font-light tracking-tight tabular-nums focus:outline-none cursor-text transition-colors"
              :class="activeField === 'btc' ? 'text-white' : 'text-[#7a6c5a]'"
              title="Click to select, then copy"
              @focus="(e) => (e.target as HTMLInputElement).select()"
            />

            <!-- Copy BTC button -->
            <button
              class="shrink-0 p-1.5 rounded-lg transition-colors"
              :class="copiedBtc
                ? 'text-[#f7931a] bg-[#191208]'
                : 'text-[#4a4236] hover:text-[#7a6c5a] hover:bg-[#141414]'"
              :title="copiedBtc ? 'Copied!' : 'Copy value'"
              @click.stop="copyBtc"
            >
              <svg v-if="!copiedBtc" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
              <svg v-else class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </button>
          </div>

          <!-- Thin divider -->
          <div class="h-px bg-[#131210] my-3 -mx-1" />

          <!-- Fiat result row -->
          <div
            class="flex items-center gap-2 cursor-pointer"
            @click="activateFiat"
          >
            <!-- Currency select -->
            <div class="shrink-0 relative flex items-center" @click.stop>
              <select
                v-model="currency"
                class="appearance-none pl-2.5 pr-6 py-1.5 rounded-lg bg-[#141414] hover:bg-[#1c1c1c] text-[#7a6c5a] text-[0.7rem] font-semibold tracking-widest font-mono cursor-pointer transition-colors focus:outline-none"
              >
                <option v-for="c in CURRENCIES" :key="c" :value="c">{{ c }}</option>
              </select>
              <svg class="pointer-events-none absolute right-2 w-2 h-2 text-[#504840]" viewBox="0 0 10 6" fill="none">
                <path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </div>

            <!-- Fiat amount display (selectable input) -->
            <input
              :value="fiatDisplay"
              readonly
              class="flex-1 min-w-0 bg-transparent text-right font-mono text-[1.25rem] font-light tracking-tight tabular-nums focus:outline-none cursor-text transition-colors"
              :class="activeField === 'fiat' ? 'text-white' : 'text-[#8a7c66]'"
              title="Click to select, then copy"
              @focus="(e) => (e.target as HTMLInputElement).select()"
            />

            <!-- Copy fiat button -->
            <button
              class="shrink-0 p-1.5 rounded-lg transition-colors"
              :class="copiedFiat
                ? 'text-[#f7931a] bg-[#191208]'
                : 'text-[#4a4236] hover:text-[#7a6c5a] hover:bg-[#141414]'"
              :title="copiedFiat ? 'Copied!' : 'Copy value'"
              @click.stop="copyFiat"
            >
              <svg v-if="!copiedFiat" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
              <svg v-else class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </button>
          </div>
        </div>

        <!-- ── Numpad ──────────────────────────────────────────────────── -->
        <div class="grid grid-cols-4 gap-px bg-[#111111]">

          <!-- Row 1: C(wide)  ⌫  ÷ -->
          <button :class="btnCls('clr') + ' col-span-2'" @click="clear">C</button>
          <button :class="btnCls('fn')" @click="backspace">
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
              <path d="M21 5H10L3 12l7 7h11V5z" stroke-linecap="round" stroke-linejoin="round" />
              <path stroke-linecap="round" d="M16 9l-4 6m0-6l4 6" stroke-width="1.6" />
            </svg>
          </button>
          <button :class="btnCls('op')" @click="operator('/')">÷</button>

          <!-- Row 2: 7  8  9  × -->
          <button :class="btnCls('n')" @click="digit('7')">7</button>
          <button :class="btnCls('n')" @click="digit('8')">8</button>
          <button :class="btnCls('n')" @click="digit('9')">9</button>
          <button :class="btnCls('op')" @click="operator('*')">×</button>

          <!-- Row 3: 4  5  6  − -->
          <button :class="btnCls('n')" @click="digit('4')">4</button>
          <button :class="btnCls('n')" @click="digit('5')">5</button>
          <button :class="btnCls('n')" @click="digit('6')">6</button>
          <button :class="btnCls('op')" @click="operator('-')">−</button>

          <!-- Row 4: 1  2  3  + -->
          <button :class="btnCls('n')" @click="digit('1')">1</button>
          <button :class="btnCls('n')" @click="digit('2')">2</button>
          <button :class="btnCls('n')" @click="digit('3')">3</button>
          <button :class="btnCls('op')" @click="operator('+')">+</button>

          <!-- Row 5: 0  .  = -->
          <button :class="btnCls('n') + ' col-span-2'" @click="digit('0')">0</button>
          <button :class="btnCls('n')" @click="decimal">.</button>
          <button :class="btnCls('eq')" @click="equals">=</button>
        </div>
      </div>

      <!-- Price footnote -->
      <div class="text-center text-[#4a4236] text-[0.625rem] tracking-[0.18em] mt-3 font-mono space-y-0.5">
        <p>1 BTC = {{ SYMBOLS[currency] }}{{ (prices[currency] ?? 0).toLocaleString('en-US') }}</p>
        <p>last price update: {{ timeAgo }}</p>
        <p>made by <a href="https://jaonoctus.dev" target="_blank" rel="noopener" class="underline underline-offset-2">jaonoctus</a> with <span class="text-[#7a3832]">love</span></p>
      </div>
    </div>
  </div>
</template>
