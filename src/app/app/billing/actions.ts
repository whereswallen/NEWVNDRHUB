"use server";
import type Stripe from "stripe";
import { count,eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { organizations,stores } from "@/db/schema";
import { requireOrganizationPermission } from "@/lib/access";
import { storefrontQuantity,stripePriceForPlan } from "@/lib/billing";
import { getStripe } from "@/lib/stripe";

export async function startCheckout(formData:FormData){
  const organizationId=String(formData.get("organizationId"));
  const {session}=await requireOrganizationPermission(organizationId,"billing:manage");
  const [organization]=await db.select().from(organizations).where(eq(organizations.id,organizationId)).limit(1);
  if(!organization)redirect("/app");
  const stripe=getStripe();
  let customerId=organization.stripeCustomerId;
  if(!customerId){const customer=await stripe.customers.create({email:session.user.email,name:organization.name,metadata:{organizationId}});customerId=customer.id;await db.update(organizations).set({stripeCustomerId:customerId,updatedAt:new Date()}).where(eq(organizations.id,organizationId));}
  const [{value:storeCount}]=await db.select({value:count()}).from(stores).where(eq(stores.organizationId,organizationId));
  const extra=storefrontQuantity(Number(storeCount));
  const items:Stripe.Checkout.SessionCreateParams.LineItem[]=[{price:stripePriceForPlan(organization.plan==="unlimited"?"unlimited":"standard"),quantity:1}];
  if(extra){const price=process.env.STRIPE_STOREFRONT_PRICE_ID;if(!price)throw new Error("Stripe storefront price is not configured");items.push({price,quantity:extra});}
  const base=process.env.NEXT_PUBLIC_APP_URL!;
  const checkout=await stripe.checkout.sessions.create({mode:"subscription",customer:customerId,line_items:items,success_url:`${base}/app/billing?checkout=success`,cancel_url:`${base}/app/billing?checkout=cancelled`,client_reference_id:organizationId,subscription_data:{metadata:{organizationId}},allow_promotion_codes:true});
  redirect(checkout.url!);
}

export async function openBillingPortal(formData:FormData){
  const organizationId=String(formData.get("organizationId"));await requireOrganizationPermission(organizationId,"billing:manage");
  const [organization]=await db.select().from(organizations).where(eq(organizations.id,organizationId)).limit(1);
  if(!organization?.stripeCustomerId)redirect("/app/billing?error=no_customer");
  const portal=await getStripe().billingPortal.sessions.create({customer:organization.stripeCustomerId,return_url:`${process.env.NEXT_PUBLIC_APP_URL}/app/billing`});redirect(portal.url);
}
