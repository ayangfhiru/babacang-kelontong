const THEME_STORAGE_KEY = "babacang-theme";

/**
 * Light/dark theme state. The `.dark` class lives on <html> and is applied
 * before hydration by the inline script in nuxt.config.ts; this composable
 * keeps the reactive state in sync with the DOM on the client only.
 */
export const useTheme = () => {
  const isDark = useState<boolean>("theme:is-dark", () => false);

  const syncFromDom = (): void => {
    if (!import.meta.client) return;
    isDark.value = document.documentElement.classList.contains("dark");
  };

  const toggleTheme = (): void => {
    if (!import.meta.client) return;
    const isNowDark = document.documentElement.classList.toggle("dark");
    isDark.value = isNowDark;
    localStorage.setItem(THEME_STORAGE_KEY, isNowDark ? "dark" : "light");
  };

  return { isDark, syncFromDom, toggleTheme };
};
