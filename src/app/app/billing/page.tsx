import {eq,sql} from "drizzle-orm";
import Link from "next/link";
import {redirect} from "next/navigation";
import {db} from "@/db";
import {memberships,organizations,stores} from "@/db/schema";
import {openBillingPortal,startCheckout,syncStorefrontBilling} from "./actions";
import {requireSession} from "@/lib/current-user";
import {additionalStorefrontCostCents} from "@/lib/entitlements";
import {hasPermission,Role} from "@/lib/permissions";

export default async function BillingPage({searchParams}:{searchParams:Promise<{blocked?:string;checkout?:string;error?:string,synced?:string}>}){
  const session=await requireSession();const query=await searchParams;
  const [context]=await db.select({membership:memberships,organization:organizations}).from(memberships).innerJoin(organizations,eq(memberships.organizationId,organizations.id)).where(eq(memberships.userId,session.user.id)).limit(1);
  if(!context||!hasPermission(context.membership.role as Role,"billing:manage",context.membership.permissions))redirect("/app");
  const [{count}]=await db.select({count:sql<number>`count(*)`}).from(stores).where(eq(stores.organizationId,context.organization.id));
  const extraCost=additionalStorefrontCostCents(Number(count));const configured=Boolean(process.env.STRIPE_SECRET_KEY&&process.env.STRIPE_STANDARD_PRICE_ID&&process.env.STRIPE_UNLIMITED_PRICE_ID&&process.env.STRIPE_STOREFRONT_PRICE_ID);
  return <main className="management-shell"><header><div><p className="eyebrow">SUBSCRIPTION</p><h1>Billing and plan</h1><p className="muted">Subscription access is controlled by verified Stripe events.</p></div><Link className="quiet-button" href="/app">Back</Link></header>
    {query.blocked&&<section className="notice"><b>Subscription action required</b><p>Your trial or paid access is no longer active. Billing remains available so the owner can restore service.</p></section>}
    {query.checkout==="success"&&<section className="notice"><b>Checkout completed</b><p>Stripe is confirming the subscription. Refresh shortly if the status has not updated.</p></section>}
    {query.synced&&<section className="notice"><b>Storefront billing synchronized</b></section>}
    <section className="metric-grid"><article><span>Selected plan</span><b className="capitalize">{context.organization.plan}</b></article><article><span>Billing status</span><b className="capitalize">{context.organization.billingStatus}</b></article><article><span>Storefronts</span><b>{count}</b></article></section>
    <section className="management-card"><h2>Monthly subscription</h2><p>{context.organization.plan==="unlimited"?"$99 CAD":"$59 CAD"} plus ${(extraCost/100).toFixed(2)} CAD for additional storefronts, before applicable tax.</p>{context.organization.trialEndsAt&&<p className="muted">Trial ends {context.organization.trialEndsAt.toLocaleDateString("en-CA")}.</p>}
      {!configured?<p className="form-error">Stripe credentials and price IDs must be configured before live checkout.</p>:context.organization.stripeSubscriptionId?<div className="header-actions"><form action={openBillingPortal}><input type="hidden" name="organizationId" value={context.organization.id}/><button className="primary-button">Manage billing in Stripe</button></form><form action={syncStorefrontBilling}><input type="hidden" name="organizationId" value={context.organization.id}/><button className="quiet-button">Sync storefront billing</button></form></div>:<form action={startCheckout}><input type="hidden" name="organizationId" value={context.organization.id}/><button className="primary-button">Activate subscription</button></form>}
    </section></main>
}
