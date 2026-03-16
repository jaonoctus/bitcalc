<script setup lang="ts">
useHead({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: 'bitcalc',
        url: 'https://bitcalc.jaonoctus.dev',
        description: 'Convert Bitcoin (BTC) and Satoshis to USD, EUR, BRL, AED and PYG with live prices.',
        applicationCategory: 'FinanceApplication',
        operatingSystem: 'Any',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      }),
    },
  ],
  meta: [
    { name: 'keywords', content: 'bitcoin calculator, satoshi converter, BTC to USD, BTC to EUR, satoshi to dollar, bitcoin price, crypto calculator' },
  ],
})
</script>

<template>
  <AppCalculator />
</template>
