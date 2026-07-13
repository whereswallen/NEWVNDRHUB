import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { squareConnections, squarePayments, squareWebhookEvents } from "@/db/schema";
import { verifySquareSignature } from "@/lib/square";

type SquarePayment={id:string;status:string;order_id?:string;location_id?:string;amount_money?:{amount?:number;currency?:string}};

export async function POST(request:Request){
  const body=await request.text(),signature=request.headers.get("x-square-hmacsha256-signature")??"",key=process.env.SQUARE_WEBHOOK_SIGNATURE_KEY,url=process.env.SQUARE_WEBHOOK_URL;
  if(!key||!url)return new Response("Webhook not configured",{status:503});
  if(!verifySquareSignature(body,signature,key,url))return new Response("Invalid signature",{status:403});
  let event:{event_id:string;type:string;data?:{object?:{payment?:SquarePayment}}};try{event=JSON.parse(body)}catch{return new Response("Invalid JSON",{status:400})}
  try{await db.transaction(async tx=>{
    const inserted=await tx.insert(squareWebhookEvents).values({id:event.event_id,type:event.type}).onConflictDoNothing().returning();if(!inserted.length)return;
    const payment=event.data?.object?.payment;if(!payment)return;
    const [expected]=await tx.select({payment:squarePayments,locationId:squareConnections.locationId}).from(squarePayments).innerJoin(squareConnections,eq(squarePayments.storeId,squareConnections.storeId)).where(and(eq(squarePayments.squarePaymentId,payment.id),eq(squareConnections.status,"active"))).limit(1);
    const amount=payment.amount_money?.amount,currency=payment.amount_money?.currency;
    if(!expected||payment.location_id!==expected.locationId||amount!==expected.payment.amountCents||currency!==expected.payment.currency)throw new Error("Square payment mismatch");
    if(!["APPROVED","COMPLETED","CANCELED","FAILED"].includes(payment.status))throw new Error("Unexpected Square status");
    await tx.update(squarePayments).set({status:payment.status,squareOrderId:payment.order_id??null,lastSynchronizedAt:new Date(),updatedAt:new Date()}).where(eq(squarePayments.id,expected.payment.id));
  });return new Response("ok")}catch{return new Response("Processing failed",{status:500})}
}
