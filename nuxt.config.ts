// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss'],
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    upstashRedisUrl: process.env.UPSTASH_REDIS_REST_URL ?? '',
    upstashRedisToken: process.env.UPSTASH_REDIS_REST_TOKEN ?? '',
  },
  app: {
    head: {
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1',
      title: 'bitcalc — Bitcoin & Satoshi Calculator',
      link: [
        { rel: 'canonical', href: 'https://bitcalc.jaonoctus.dev' },
      ],
      meta: [
        { name: 'description', content: 'Convert Bitcoin (BTC) and Satoshis to USD, EUR, BRL, AED, PYG, INR and ILS with live prices. Fast, free, no ads.' },
        { name: 'theme-color', content: '#f7931a' },
        // Open Graph
        { property: 'og:type', content: 'website' },
        { property: 'og:url', content: 'https://bitcalc.jaonoctus.dev' },
        { property: 'og:title', content: 'bitcalc — Bitcoin & Satoshi Calculator' },
        { property: 'og:description', content: 'Convert Bitcoin (BTC) and Satoshis to USD, EUR, BRL, AED, PYG, INR and ILS with live prices. Fast, free, no ads.' },
        { property: 'og:site_name', content: 'bitcalc' },
        // Twitter Card
        { name: 'twitter:card', content: 'summary' },
        { name: 'twitter:site', content: '@jaonoctus' },
        { name: 'twitter:title', content: 'bitcalc — Bitcoin & Satoshi Calculator' },
        { name: 'twitter:description', content: 'Convert Bitcoin (BTC) and Satoshis to USD, EUR, BRL, AED, PYG, INR and ILS with live prices. Fast, free, no ads.' },
      ],
    },
  },
})
