import { describe, it, expect, beforeEach } from 'vitest'
import { ref, createApp } from 'vue'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

function withSetup<T>(composable: () => T): T {
  let result!: T
  const app = createApp({
    setup() {
      result = composable()
      return () => {}
    },
  })
  app.mount(document.createElement('div'))
  return result
}

mockNuxtImport('usePrices', () => {
  return () => ({
    data: ref({
      provider: 'test',
      prices: { USD: 50000, EUR: 45000, BRL: 250000, AED: 183500, PYG: 350000000, INR: 4200000, ILS: 185000 },
      fetchedAt: '2024-01-01T00:00:00.000Z',
    }),
  })
})

// USD price = 50_000 throughout all tests
// 1 sat  = $0.0005
// 100_000 sats = $50
// 1 BTC  = $50_000

describe('useCalculator', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('digit()', () => {
    it('appends digits to expression', () => {
      const { expression, digit } = withSetup(() => useCalculator())
      digit('1')
      digit('2')
      digit('3')
      expect(expression.value).toBe('123')
    })

    it('replaces expression after equals', () => {
      const { expression, digit, equals } = withSetup(() => useCalculator())
      digit('5')
      equals()
      digit('3')
      expect(expression.value).toBe('3')
    })
  })

  describe('operator()', () => {
    it('does nothing on empty expression', () => {
      const { expression, operator } = withSetup(() => useCalculator())
      operator('+')
      expect(expression.value).toBe('')
    })

    it('appends operator', () => {
      const { expression, digit, operator } = withSetup(() => useCalculator())
      digit('5')
      operator('+')
      expect(expression.value).toBe('5+')
    })

    it('replaces a trailing operator', () => {
      const { expression, digit, operator } = withSetup(() => useCalculator())
      digit('5')
      operator('+')
      operator('*')
      expect(expression.value).toBe('5*')
    })

    it('clears justEvaluated flag', () => {
      const { expression, digit, equals, operator } = withSetup(() => useCalculator())
      digit('5')
      equals()
      operator('+')
      // after operator, justEvaluated is false so next digit appends
      digit('3')
      expect(expression.value).toBe('5+3')
    })
  })

  describe('decimal()', () => {
    it('adds decimal to an integer part', () => {
      const { expression, digit, decimal } = withSetup(() => useCalculator())
      digit('5')
      decimal()
      expect(expression.value).toBe('5.')
    })

    it('prepends 0 on empty expression', () => {
      const { expression, decimal } = withSetup(() => useCalculator())
      decimal()
      expect(expression.value).toBe('0.')
    })

    it('prepends 0 after a trailing operator', () => {
      const { expression, digit, operator, decimal } = withSetup(() => useCalculator())
      digit('5')
      operator('+')
      decimal()
      expect(expression.value).toBe('5+0.')
    })

    it('prevents a second decimal in the same part', () => {
      const { expression, digit, decimal } = withSetup(() => useCalculator())
      digit('5')
      decimal()
      decimal()
      expect(expression.value).toBe('5.')
    })

    it('allows a decimal in a new part after operator', () => {
      const { expression, digit, operator, decimal } = withSetup(() => useCalculator())
      digit('5')
      decimal()
      digit('5')
      operator('+')
      digit('3')
      decimal()
      expect(expression.value).toBe('5.5+3.')
    })
  })

  describe('clear()', () => {
    it('empties the expression', () => {
      const { expression, digit, clear } = withSetup(() => useCalculator())
      digit('1')
      digit('2')
      clear()
      expect(expression.value).toBe('')
    })
  })

  describe('backspace()', () => {
    it('removes the last character', () => {
      const { expression, digit, backspace } = withSetup(() => useCalculator())
      digit('1')
      digit('2')
      digit('3')
      backspace()
      expect(expression.value).toBe('12')
    })

    it('clears the whole expression after equals', () => {
      const { expression, digit, equals, backspace } = withSetup(() => useCalculator())
      digit('5')
      digit('5')
      equals()
      backspace()
      expect(expression.value).toBe('')
    })
  })

  describe('percent()', () => {
    it('divides the current value by 100', () => {
      const { expression, digit, percent } = withSetup(() => useCalculator())
      digit('1')
      digit('0')
      digit('0')
      percent()
      expect(expression.value).toBe('1')
    })

    it('handles decimals correctly', () => {
      const { expression, digit, percent } = withSetup(() => useCalculator())
      digit('5')
      digit('0')
      percent()
      expect(expression.value).toBe('0.5')
    })

    it('does nothing on empty expression', () => {
      const { expression, percent } = withSetup(() => useCalculator())
      percent()
      expect(expression.value).toBe('')
    })
  })

  describe('equals()', () => {
    it('evaluates a simple expression', () => {
      const { expression, digit, operator, equals } = withSetup(() => useCalculator())
      digit('2')
      operator('+')
      digit('3')
      equals()
      expect(expression.value).toBe('5')
    })

    it('evaluates multiplication', () => {
      const { expression, digit, operator, equals } = withSetup(() => useCalculator())
      digit('6')
      operator('*')
      digit('7')
      equals()
      expect(expression.value).toBe('42')
    })

    it('sets justEvaluated so next digit resets the expression', () => {
      const { expression, digit, operator, equals } = withSetup(() => useCalculator())
      digit('2')
      operator('+')
      digit('3')
      equals()
      digit('9')
      expect(expression.value).toBe('9')
    })

    it('does nothing on empty expression', () => {
      const { expression, equals } = withSetup(() => useCalculator())
      equals()
      expect(expression.value).toBe('')
    })
  })

  describe('paren()', () => {
    it('inserts an opening paren on empty expression', () => {
      const { expression, paren } = withSetup(() => useCalculator())
      paren()
      expect(expression.value).toBe('(')
    })

    it('inserts an opening paren after an operator', () => {
      const { expression, digit, operator, paren } = withSetup(() => useCalculator())
      digit('1')
      operator('+')
      paren()
      expect(expression.value).toBe('1+(')
    })

    it('inserts a closing paren when there is an unclosed open paren', () => {
      const { expression, paren, digit } = withSetup(() => useCalculator())
      paren()     // (
      digit('5')
      paren()     // should close → (5)
      expect(expression.value).toBe('(5)')
    })

    it('inserts an opening paren after an operator inside parens', () => {
      const { expression, paren, digit, operator } = withSetup(() => useCalculator())
      paren()     // (
      digit('5')
      operator('+') // (5+
      paren()     // opens new → (5+(
      expect(expression.value).toBe('(5+(')
    })
  })

  describe('btcDisplay', () => {
    it('returns "0" when expression is empty', () => {
      const { btcDisplay } = withSetup(() => useCalculator())
      expect(btcDisplay.value).toBe('0')
    })

    it('formats satoshis with thousands separator in sat mode', () => {
      const { btcDisplay, digit } = withSetup(() => useCalculator())
      // 100_000 sats
      '100000'.split('').forEach(d => digit(d))
      expect(btcDisplay.value).toBe('100,000')
    })

    it('formats BTC with up to 8 decimal places in btc mode', () => {
      const { btcDisplay, digit, cycleUnit } = withSetup(() => useCalculator())
      // switch to btc unit first (starts in sat)
      cycleUnit()
      digit('1')
      expect(btcDisplay.value).toBe('1')
    })

    it('always shows sats in bip177 mode', () => {
      const { btcDisplay, digit } = withSetup(() => useCalculator({ bip177: true }))
      '100000'.split('').forEach(d => digit(d))
      expect(btcDisplay.value).toBe('100,000')
    })
  })

  describe('fiatDisplay', () => {
    it('shows symbol + "0.00" when expression is empty', () => {
      const { fiatDisplay } = withSetup(() => useCalculator())
      expect(fiatDisplay.value).toBe('$0.00')
    })

    it('formats a regular fiat amount', () => {
      const { fiatDisplay, activeField, digit } = withSetup(() => useCalculator())
      activeField.value = 'fiat'
      '1000'.split('').forEach(d => digit(d))
      expect(fiatDisplay.value).toBe('$1,000.00')
    })

    it('abbreviates billions', () => {
      const { fiatDisplay, activeField, digit } = withSetup(() => useCalculator())
      activeField.value = 'fiat'
      '1500000000'.split('').forEach(d => digit(d))
      expect(fiatDisplay.value).toBe('$1.50B')
    })

    it('abbreviates millions', () => {
      const { fiatDisplay, activeField, digit } = withSetup(() => useCalculator())
      activeField.value = 'fiat'
      '1500000'.split('').forEach(d => digit(d))
      expect(fiatDisplay.value).toBe('$1.50M')
    })

    it('shows "< $0.01" for tiny amounts', () => {
      const { fiatDisplay, activeField, digit, decimal } = withSetup(() => useCalculator())
      activeField.value = 'fiat'
      digit('0')
      decimal()
      digit('0')
      digit('0')
      digit('5')
      expect(fiatDisplay.value).toBe('< $0.01')
    })

    it('uses the correct currency symbol', () => {
      const { fiatDisplay, currency, activeField, digit } = withSetup(() => useCalculator())
      currency.value = 'EUR'
      activeField.value = 'fiat'
      '100'.split('').forEach(d => digit(d))
      expect(fiatDisplay.value).toBe('€100.00')
    })
  })

  describe('cycleUnit()', () => {
    it('converts sats to BTC and updates expression', () => {
      const { unit, expression, digit, cycleUnit } = withSetup(() => useCalculator())
      '100000'.split('').forEach(d => digit(d))
      cycleUnit()
      expect(unit.value).toBe('btc')
      expect(expression.value).toBe('0.001')
    })

    it('converts BTC back to sats and updates expression', () => {
      const { unit, expression, digit, cycleUnit } = withSetup(() => useCalculator())
      cycleUnit()            // sat → btc
      digit('0'); digit('.'); digit('0'); digit('0'); digit('1')
      cycleUnit()            // btc → sat
      expect(unit.value).toBe('sat')
      expect(expression.value).toBe('100000')
    })

    it('only toggles the unit when on the fiat field', () => {
      const { unit, activeField, expression, digit, cycleUnit } = withSetup(() => useCalculator())
      activeField.value = 'fiat'
      '100'.split('').forEach(d => digit(d))
      cycleUnit()
      expect(unit.value).toBe('btc')
      // expression should be unchanged since we are on the fiat field
      expect(expression.value).toBe('100')
    })
  })

  describe('activateFiat()', () => {
    it('converts btc expression to fiat', () => {
      const { expression, activeField, digit, activateFiat } = withSetup(() => useCalculator())
      // 100_000 sats → $50 at $50k/BTC
      '100000'.split('').forEach(d => digit(d))
      activateFiat()
      expect(activeField.value).toBe('fiat')
      expect(expression.value).toBe('50')
    })

    it('does nothing when already on fiat field', () => {
      const { expression, activeField, digit, activateFiat } = withSetup(() => useCalculator())
      activeField.value = 'fiat'
      '50'.split('').forEach(d => digit(d))
      activateFiat()
      expect(expression.value).toBe('50')
    })
  })

  describe('activateBtc()', () => {
    it('converts fiat expression to btc', () => {
      const { expression, activeField, digit, activateBtc } = withSetup(() => useCalculator())
      activeField.value = 'fiat'
      '50'.split('').forEach(d => digit(d))
      activateBtc()
      expect(activeField.value).toBe('btc')
      // $50 at $50k/BTC = 0.001 BTC = 100_000 sats (unit is sat)
      expect(expression.value).toBe('100000')
    })

    it('restores original btc expression when fiat was not edited', () => {
      const { expression, digit, activateFiat, activateBtc } = withSetup(() => useCalculator())
      // type 100_000 sats on btc field
      '100000'.split('').forEach(d => digit(d))
      activateFiat()               // switches to fiat, saves original
      activateBtc()                // no edits → should restore
      expect(expression.value).toBe('100000')
    })

    it('does nothing when already on btc field', () => {
      const { expression, digit, activateBtc } = withSetup(() => useCalculator())
      '42'.split('').forEach(d => digit(d))
      activateBtc()
      expect(expression.value).toBe('42')
    })
  })
})
