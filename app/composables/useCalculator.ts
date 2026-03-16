import { DateTime } from 'luxon'
import BigNumber from 'bignumber.js'

export const SYMBOLS: Record<string, string> = { USD: '$', EUR: '€', BRL: 'R$', AED: 'د.إ', PYG: '₲', INR: '₹', ILS: '₪' }
export const CURRENCIES = ['AED', 'BRL', 'EUR', 'ILS', 'INR', 'PYG', 'USD'] as const
export type Currency = (typeof CURRENCIES)[number]

export function useCalculator(options?: { bip177?: boolean }) {
  const bip177 = options?.bip177 ?? false

  // ─── Prices ───────────────────────────────────────────────────────────────
  const { data: priceData } = usePrices()
  const prices = computed(() => priceData.value?.prices ?? {})
  const priceUpdatedAt = computed(() =>
    priceData.value?.fetchedAt ? DateTime.fromISO(priceData.value.fetchedAt) : null,
  )

  // ─── State ────────────────────────────────────────────────────────────────
  const activeField = ref<'btc' | 'fiat'>('btc')
  const expression = ref('')
  const unit = ref<'sat' | 'btc'>('sat')
  const CURRENCY_KEY = 'bitcalc:currency'
  const storedCurrency = import.meta.client ? localStorage.getItem(CURRENCY_KEY) : null
  const currency = ref<Currency>(
    CURRENCIES.includes(storedCurrency as Currency) ? (storedCurrency as Currency) : 'USD',
  )
  watch(currency, (val) => { if (import.meta.client) localStorage.setItem(CURRENCY_KEY, val) })
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

  // ─── Safe expression evaluator ────────────────────────────────────────────
  function safeEval(expr: string): BigNumber | null {
    const clean = expr.trim()
    if (!clean) return null
    if (!/^[\d\s+\-*/().]+$/.test(clean)) return null
    try {
      // eslint-disable-next-line no-new-func
      const result = new Function(`"use strict"; return (${clean})`)()
      if (typeof result !== 'number' || !isFinite(result) || isNaN(result)) return null
      return new BigNumber(result)
    }
    catch { return null }
  }

  // ─── Computed values ──────────────────────────────────────────────────────
  const parsedValue = computed(() => safeEval(expression.value))

  const btcAmt = computed((): BigNumber | null => {
    if (parsedValue.value === null) return null
    const price = new BigNumber(prices.value[currency.value] ?? 1)
    if (activeField.value === 'btc') {
      if (bip177) return parsedValue.value.div('1e8')
      return unit.value === 'btc' ? parsedValue.value : parsedValue.value.div('1e8')
    }
    return parsedValue.value.div(price)
  })

  const fiatAmt = computed((): BigNumber | null => {
    if (parsedValue.value === null) return null
    if (activeField.value === 'fiat') return parsedValue.value
    if (btcAmt.value === null) return null
    const price = new BigNumber(prices.value[currency.value] ?? 1)
    return btcAmt.value.times(price)
  })

  // ─── Display formatters ───────────────────────────────────────────────────
  const btcDisplay = computed(() => {
    if (btcAmt.value === null) return '0'
    if (bip177 || unit.value === 'sat')
      return btcAmt.value.times('1e8').integerValue(BigNumber.ROUND_HALF_UP).toFormat(0)
    return parseFloat(btcAmt.value.toFixed(8)).toLocaleString('en-US', { maximumFractionDigits: 8 })
  })

  const fiatDisplay = computed(() => {
    if (fiatAmt.value === null) return `${SYMBOLS[currency.value]}0.00`
    const sym = SYMBOLS[currency.value]
    const v = fiatAmt.value
    const absV = v.abs()
    if (v.isZero()) return `${sym}0.00`
    if (absV.isGreaterThanOrEqualTo('1e9')) return `${sym}${v.div('1e9').toFixed(2)}B`
    if (absV.isGreaterThanOrEqualTo('1e6')) return `${sym}${v.div('1e6').toFixed(2)}M`
    if (absV.isGreaterThan(0) && absV.isLessThan('0.01')) return `< ${sym}0.01`
    return `${sym}${parseFloat(v.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  })

  // ─── Button action handlers ───────────────────────────────────────────────
  function focusExpr() {
    nextTick(() => exprInputRef.value?.focus())
  }

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
    if (v !== null) { expression.value = v.div(100).toFixed(); justEvaluated.value = true }
  }

  function equals() {
    const v = safeEval(expression.value)
    if (v !== null) { expression.value = v.toFixed(); justEvaluated.value = true }
    focusExpr()
  }

  // ─── Field switching ──────────────────────────────────────────────────────
  function activateBtc() {
    if (activeField.value === 'btc') return
    const fiatRaw = safeEval(expression.value)
    if (fiatRaw !== null) {
      const price = new BigNumber(prices.value[currency.value] ?? 1)
      const btcVal = fiatRaw.div(price)
      expression.value = (bip177 || unit.value === 'sat')
        ? btcVal.times('1e8').integerValue(BigNumber.ROUND_HALF_UP).toFixed(0)
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
      const price = new BigNumber(prices.value[currency.value] ?? 1)
      const btcVal = (bip177 || unit.value === 'sat') ? btcRaw.div('1e8') : btcRaw
      expression.value = parseFloat(btcVal.times(price).toFixed(2)).toString()
      justEvaluated.value = true
    }
    activeField.value = 'fiat'
    focusExpr()
  }

  // ─── Unit cycling (standard mode only) ───────────────────────────────────
  function cycleUnit() {
    if (activeField.value === 'fiat') {
      unit.value = unit.value === 'sat' ? 'btc' : 'sat'
      return
    }
    const v = parsedValue.value
    if (unit.value === 'sat') {
      unit.value = 'btc'
      if (v !== null) { expression.value = parseFloat(v.div('1e8').toFixed(8)).toString(); justEvaluated.value = true }
    }
    else {
      unit.value = 'sat'
      if (v !== null) { expression.value = v.times('1e8').integerValue(BigNumber.ROUND_HALF_UP).toFixed(0); justEvaluated.value = true }
    }
  }

  // ─── Clipboard ────────────────────────────────────────────────────────────
  async function copyBtc() {
    if (btcAmt.value === null) return
    const text = (bip177 || unit.value === 'sat')
      ? btcAmt.value.times('1e8').integerValue(BigNumber.ROUND_HALF_UP).toFixed(0)
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

  // ─── Keyboard support ─────────────────────────────────────────────────────
  function onExprKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); equals() }
    if (e.key === 'Escape') { e.preventDefault(); clear() }
  }

  function onWindowKeydown(e: KeyboardEvent) {
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

  return {
    // state
    activeField, expression, unit, currency, justEvaluated, copiedBtc, copiedFiat, exprInputRef,
    // computed
    prices, timeAgo, btcDisplay, fiatDisplay,
    // actions
    digit, operator, decimal, clear, backspace, percent, equals,
    activateBtc, activateFiat, cycleUnit,
    copyBtc, copyFiat, onExprKeydown,
  }
}
