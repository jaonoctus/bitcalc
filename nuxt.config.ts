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
})
