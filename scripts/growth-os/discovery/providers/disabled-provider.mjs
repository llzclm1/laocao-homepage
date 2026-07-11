export function createDisabledProvider() {
  return {
    name: "disabled",
    status: "not_configured",
    async search() {
      return { status: "not_configured", items: [], error: null };
    }
  };
}
