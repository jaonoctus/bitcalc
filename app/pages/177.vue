<script setup lang="ts">
useHead({
  title: 'bitcalc · BIP-177 — Bitcoin Base Unit Calculator',
  meta: [
    { name: 'description', content: 'Bitcoin calculator using BIP-177 denomination. Convert BTC to USD, EUR, BRL, AED, PYG, INR and ILS with live prices.' },
    { property: 'og:title', content: 'bitcalc · BIP-177 — Bitcoin Base Unit Calculator' },
    { property: 'og:description', content: 'Bitcoin calculator using BIP-177 denomination. Convert BTC to USD, EUR, BRL, AED, PYG, INR and ILS with live prices.' },
    { name: 'twitter:title', content: 'bitcalc · BIP-177 — Bitcoin Base Unit Calculator' },
    { name: 'twitter:description', content: 'Bitcoin calculator using BIP-177 denomination. Convert BTC to USD, EUR, BRL, AED, PYG, INR and ILS with live prices.' },
  ],
})
</script>

<template>
  <AppCalculator bip177 />
</template>
