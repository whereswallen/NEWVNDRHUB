export type Plan="trial"|"standard"|"unlimited";
export const VENDOR_LIMITS:Record<Plan,number>={trial:40,standard:40,unlimited:Number.POSITIVE_INFINITY};
export function canAddVendor(plan:Plan,activeVendorCount:number){return activeVendorCount<VENDOR_LIMITS[plan]}
export function additionalStorefrontCostCents(storefrontCount:number){return Math.max(0,storefrontCount-1)*2000}
