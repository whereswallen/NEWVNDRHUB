import {and,eq} from "drizzle-orm";
import Stripe from "stripe";
import {db} from "@/db";
import {memberships,organizations,stripeWebhookEvents,users} from "@/db/schema";
import {getStripe} from "@/lib/stripe";
import {planFromPriceIds} from "@/lib/billing";
import {sendEmail} from "@/lib/email";

export async function POST(request:Request){
  const secret=process.env.STRIPE_WEBHOOK_SECRET;if(!secret)return new Response("Webhook not configured",{status:503});
  let event:Stripe.Event;try{event=getStripe().webhooks.constructEvent(await request.text(),request.headers.get("stripe-signature")??"",secret)}catch{return new Response("Invalid signature",{status:400})}
  let notification:{organizationId:string;kind:"trial"|"failed"}|undefined;try{await db.transaction(async tx=>{
    const inserted=await tx.insert(stripeWebhookEvents).values({id:event.id,type:event.type}).onConflictDoNothing().returning();if(!inserted.length)return;
    if(event.type.startsWith("customer.subscription.")){
      const subscription=event.data.object as Stripe.Subscription;const organizationId=subscription.metadata.organizationId;
      if(!organizationId)throw new Error("Subscription missing organizationId");
      const firstItem=subscription.items.data[0];const plan=planFromPriceIds(subscription.items.data.map(item=>item.price.id),{standard:process.env.STRIPE_STANDARD_PRICE_ID,unlimited:process.env.STRIPE_UNLIMITED_PRICE_ID});
      if(!plan)throw new Error("Subscription contains an unapproved price");
      const customerId=String(subscription.customer);const [organization]=await tx.select().from(organizations).where(eq(organizations.id,organizationId)).limit(1);
      if(!organization||organization.stripeCustomerId&&organization.stripeCustomerId!==customerId||organization.stripeSubscriptionId&&organization.stripeSubscriptionId!==subscription.id)throw new Error("Subscription tenant mismatch");
      await tx.update(organizations).set({stripeCustomerId:customerId,stripeSubscriptionId:subscription.id,billingStatus:subscription.status,billingPeriodEndsAt:firstItem?new Date(firstItem.current_period_end*1000):null,cancelAtPeriodEnd:subscription.cancel_at_period_end,plan,updatedAt:new Date()}).where(eq(organizations.id,organizationId));if(event.type==="customer.subscription.trial_will_end")notification={organizationId,kind:"trial"};
    }
    if(event.type==="invoice.payment_failed"){const invoice=event.data.object as Stripe.Invoice;const [organization]=await tx.select().from(organizations).where(eq(organizations.stripeCustomerId,String(invoice.customer))).limit(1);if(organization){await tx.update(organizations).set({billingStatus:"past_due",updatedAt:new Date()}).where(eq(organizations.id,organization.id));notification={organizationId:organization.id,kind:"failed"}}}
  });if(notification){const recipients=await db.select({email:users.email,name:organizations.name}).from(memberships).innerJoin(users,eq(memberships.userId,users.id)).innerJoin(organizations,eq(memberships.organizationId,organizations.id)).where(and(eq(memberships.organizationId,notification.organizationId),eq(memberships.role,"owner")));for(const recipient of recipients)try{await sendEmail({to:recipient.email,subject:notification.kind==="trial"?"Your VNDR Hub trial ends soon":"VNDR Hub payment failed",heading:notification.kind==="trial"?"Trial ending soon":"Payment action required",message:notification.kind==="trial"?`Your ${recipient.name} trial is ending soon. Add or confirm billing details to keep access.`:`We could not process the subscription payment for ${recipient.name}. Open Billing to update the payment method.`,actionLabel:"Open billing",actionUrl:`${process.env.NEXT_PUBLIC_APP_URL}/app/billing`})}catch{}}
  return new Response("ok")}catch{return new Response("Webhook processing failed",{status:500})}
}
