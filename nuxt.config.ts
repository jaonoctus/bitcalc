// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxtjs/tailwindcss',
  ],
  appConfig: {
    coingeckoURL: 'https://api.coingecko.com/api/v3/exchange_rates',
  },
})
