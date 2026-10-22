/**
 * Mirror a reactive value with a delay — used for search inputs so the API is
 * not refetched on every keystroke.
 */
export const useDebouncedRef = <T>(source: Ref<T>, delay = 350): Ref<T> => {
  const debounced = ref(source.value) as Ref<T>;
  let timer: ReturnType<typeof setTimeout> | undefined;

  watch(source, (value) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      debounced.value = value;
    }, delay);
  });

  onScopeDispose(() => clearTimeout(timer));

  return debounced;
};
