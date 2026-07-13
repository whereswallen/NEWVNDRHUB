import {eq} from "drizzle-orm";
import Stripe from "stripe";
import {db} from "@/db";
import {organizations,stripeWebhookEvents} from "@/db/schema";
import {getStripe} from "@/lib/stripe";

export async function POST(request:Request){
  const secret=process.env.STRIPE_WEBHOOK_SECRET;if(!secret)return new Response("Webhook not configured",{status:503});
  let event:Stripe.Event;try{event=getStripe().webhooks.constructEvent(await request.text(),request.headers.get("stripe-signature")??"",secret)}catch{return new Response("Invalid signature",{status:400})}
  try{await db.transaction(async tx=>{
    const inserted=await tx.insert(stripeWebhookEvents).values({id:event.id,type:event.type}).onConflictDoNothing().returning();if(!inserted.length)return;
    if(event.type.startsWith("customer.subscription.")){
      const subscription=event.data.object as Stripe.Subscription;const organizationId=subscription.metadata.organizationId;
      if(!organizationId)throw new Error("Subscription missing organizationId");
      const firstItem=subscription.items.data[0];
      await tx.update(organizations).set({stripeCustomerId:String(subscription.customer),stripeSubscriptionId:subscription.id,billingStatus:subscription.status,billingPeriodEndsAt:firstItem?new Date(firstItem.current_period_end*1000):null,cancelAtPeriodEnd:subscription.cancel_at_period_end,updatedAt:new Date()}).where(eq(organizations.id,organizationId));
    }
  });return new Response("ok")}catch{return new Response("Webhook processing failed",{status:500})}
}
