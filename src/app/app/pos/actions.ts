"use server";

import { and, eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { auditLog, inventoryMovements, products, saleItems, sales, stores, storeTaxComponents, vendors } from "@/db/schema";
import { requireStorePermission } from "@/lib/access";
import { calculateLine } from "@/lib/sale-calculations";

const checkoutInput=z.object({organizationId:z.string().uuid(),storeId:z.string().uuid(),idempotencyKey:z.string().uuid(),paymentMethod:z.literal("cash"),cart:z.string().max(100000)});
const cartInput=z.array(z.object({productId:z.string().uuid(),quantity:z.number().int().positive().max(1000)})).min(1).max(200);

export async function completeSale(formData:FormData){
  const parsed=checkoutInput.safeParse(Object.fromEntries(formData));if(!parsed.success)redirect("/app/pos?error=invalid");let rawCart:unknown;try{rawCart=JSON.parse(parsed.data.cart)}catch{redirect("/app/pos?error=invalid")}const validatedCart=cartInput.safeParse(rawCart);if(!validatedCart.success)redirect("/app/pos?error=invalid");const quantities=new Map<string,number>();for(const line of validatedCart.data)quantities.set(line.productId,(quantities.get(line.productId)??0)+line.quantity);const cart=[...quantities].map(([productId,quantity])=>({productId,quantity}));if(cart.some(line=>line.quantity>1000))redirect("/app/pos?error=invalid");const {session}=await requireStorePermission(parsed.data.organizationId,parsed.data.storeId,"pos:sell");
  let orderNumber="";
  try{await db.transaction(async tx=>{
    const [duplicate]=await tx.select().from(sales).where(eq(sales.idempotencyKey,parsed.data.idempotencyKey)).limit(1);if(duplicate){orderNumber=duplicate.orderNumber;return;}
    const [store]=await tx.select().from(stores).where(and(eq(stores.id,parsed.data.storeId),eq(stores.organizationId,parsed.data.organizationId),eq(stores.status,"active"))).limit(1);if(!store)throw new Error("Store unavailable");
    const taxes=(await tx.select().from(storeTaxComponents).where(and(eq(storeTaxComponents.storeId,store.id),eq(storeTaxComponents.status,"active")))).map(t=>({name:t.name,rate:Number(t.rate)}));
    const ids=cart.map(item=>item.productId).sort();for(const id of ids)await tx.execute(sql`select id from ${products} where id=${id} for update`);
    const lines=[] as Array<{product:typeof products.$inferSelect;vendor:typeof vendors.$inferSelect;quantity:number;calculation:ReturnType<typeof calculateLine>}>;
    for(const cartLine of cart){const [record]=await tx.select({product:products,vendor:vendors}).from(products).innerJoin(vendors,eq(products.vendorId,vendors.id)).where(and(eq(products.id,cartLine.productId),eq(products.organizationId,parsed.data.organizationId),eq(products.storeId,store.id),eq(products.status,"active"))).limit(1);if(!record)throw new Error("Product unavailable");const [balance]=await tx.select({quantity:sql<number>`coalesce(sum(${inventoryMovements.quantityDelta}),0)`}).from(inventoryMovements).where(eq(inventoryMovements.productId,record.product.id));if(Number(balance.quantity)<cartLine.quantity)throw new Error("Insufficient stock");if(record.product.taxCode==="standard"&&!taxes.length)throw new Error("Taxes not configured");lines.push({product:record.product,vendor:record.vendor,quantity:cartLine.quantity,calculation:calculateLine({unitPriceCents:record.product.priceCents,quantity:cartLine.quantity,commissionRate:Number(record.vendor.commissionRate),taxable:record.product.taxCode==="standard",taxes})});}
    const subtotalCents=lines.reduce((sum,line)=>sum+line.calculation.subtotalCents,0);const taxCents=lines.reduce((sum,line)=>sum+line.calculation.taxCents,0);orderNumber=`VH-${Date.now().toString(36).toUpperCase()}-${randomSuffix()}`;
    const [sale]=await tx.insert(sales).values({organizationId:parsed.data.organizationId,storeId:store.id,orderNumber,status:"completed",paymentMethod:parsed.data.paymentMethod,subtotalCents,taxCents,totalCents:subtotalCents+taxCents,idempotencyKey:parsed.data.idempotencyKey,createdBy:session.user.id,completedAt:new Date()}).returning();
    for(const line of lines){await tx.insert(saleItems).values({saleId:sale.id,productId:line.product.id,vendorId:line.vendor.id,quantity:line.quantity,unitPriceCents:line.product.priceCents,taxCents:line.calculation.taxCents,taxBreakdown:line.calculation.taxBreakdown,commissionRate:line.vendor.commissionRate,commissionCents:line.calculation.commissionCents,vendorNetCents:line.calculation.vendorNetCents});await tx.insert(inventoryMovements).values({organizationId:parsed.data.organizationId,storeId:store.id,productId:line.product.id,quantityDelta:-line.quantity,reason:"sale",referenceType:"sale",referenceId:sale.id,createdBy:session.user.id});}
    await tx.insert(auditLog).values({organizationId:parsed.data.organizationId,storeId:store.id,actorUserId:session.user.id,action:"sale.completed",entityType:"sale",entityId:sale.id,payload:{orderNumber,paymentMethod:parsed.data.paymentMethod,totalCents:subtotalCents+taxCents}});
  });}catch{redirect(`/app/pos?store=${parsed.data.storeId}&error=checkout`);}
  redirect(`/app/pos?store=${parsed.data.storeId}&completed=${encodeURIComponent(orderNumber)}`);
}

function randomSuffix(){return Math.random().toString(36).slice(2,6).toUpperCase()}
