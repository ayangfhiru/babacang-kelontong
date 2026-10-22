import tailwindcss from "@tailwindcss/vite";

// Prevent FOUC: apply the persisted theme class before hydration.
const themeInitScript = `(function(){try{var s=localStorage.getItem("babacang-theme");if(s==="dark"||(!s&&window.matchMedia("(prefers-color-scheme: dark)").matches)){document.documentElement.classList.add("dark");}}catch(e){}})();`;

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  css: ["~/assets/main.css"],
  vite: {
    plugins: [tailwindcss()],
  },
  components: [
    { path: "~/components/ui", pathPrefix: false },
    { path: "~/components/layout", pathPrefix: false },
    { path: "~/components/admin", pathPrefix: false },
  ],
  // Nuxt's default auto-import scan is non-recursive; nested utils
  // (utils/format/*, utils/api/*) need an explicit glob.
  imports: {
    dirs: ["utils/**"],
  },
  app: {
    head: {
      htmlAttrs: { lang: "id" },
      title: "Babacang Kelontong — Manajemen Barang",
      link: [
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,200..800&family=JetBrains+Mono:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap",
        },
      ],
      script: [{ key: "theme-init", innerHTML: themeInitScript }],
    },
  },
});
