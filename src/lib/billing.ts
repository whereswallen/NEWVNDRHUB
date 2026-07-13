export type BillingOrganization={status:string;billingStatus:string;trialEndsAt:Date|null};

export function hasBillingAccess(organization:BillingOrganization,now=new Date()){
  if(organization.status!=="active")return false;
  if(["active","trialing"].includes(organization.billingStatus)){
    return organization.billingStatus!=="trialing"||Boolean(organization.trialEndsAt&&organization.trialEndsAt>now);
  }
  return false;
}

export function stripePriceForPlan(plan:"standard"|"unlimited"){
  const price=plan==="standard"?process.env.STRIPE_STANDARD_PRICE_ID:process.env.STRIPE_UNLIMITED_PRICE_ID;
  if(!price)throw new Error(`Stripe ${plan} price is not configured`);
  return price;
}

export function storefrontQuantity(count:number){return Math.max(0,count-1)}
