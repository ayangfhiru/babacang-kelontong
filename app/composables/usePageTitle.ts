/**
 * Page title shared between pages and the admin layout shell: pages set it,
 * the layout renders it in the sticky header (and updates the document title).
 */
export const usePageTitle = (title?: string): { title: Ref<string> } => {
  const current = useState<string>("page-title", () => "Manajemen Barang");

  if (title !== undefined) {
    current.value = title;
    useHead({ title: `${title} — Babacang Kelontong` });
  }

  return { title: current };
};
