<script setup lang="ts">
import { SYMBOLS, CURRENCIES, useCalculator } from '~/composables/useCalculator'

const props = defineProps<{ bip177?: boolean }>()

const {
  activeField, expression, unit, currency, copiedBtc, copiedFiat, exprInputRef,
  prices, timeAgo, btcDisplay, fiatDisplay,
  digit, operator, decimal, clear, backspace, percent, equals,
  activateBtc, activateFiat, cycleUnit,
  copyBtc, copyFiat, onExprKeydown,
} = useCalculator({ bip177: props.bip177 })

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
              inputmode="none"
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
            <!-- BIP-177: static ₿ badge — standard: unit toggle -->
            <template v-if="bip177">
              <div class="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#141414]">
                <span class="text-[#f7931a] text-[0.85rem] font-bold leading-none" style="text-shadow: 0 0 8px rgba(247,147,26,0.4)">₿</span>
              </div>
            </template>
            <template v-else>
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
            </template>

            <!-- BTC amount display -->
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

            <!-- Fiat amount display -->
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
