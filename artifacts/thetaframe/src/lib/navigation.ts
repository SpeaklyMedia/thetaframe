export function getPreferredRoute(modules: string[], isAdmin: boolean): string {
  if (modules.includes("daily")) return "/daily";
  if (modules.includes("weekly")) return "/weekly";
  if (modules.includes("vision")) return "/vision";
  if (modules.includes("bizdev")) return "/bizdev";
  if (modules.includes("life-ledger")) return "/life-ledger";
  if (modules.includes("reach")) return "/reach";
  if (isAdmin) return "/admin";
  return "/daily";
}
