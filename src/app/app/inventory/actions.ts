"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { auditLog, inventoryMovements, memberships, products, stores, vendors } from "@/db/schema";
import { requireSession } from "@/lib/current-user";
import { hasPermission, Role } from "@/lib/permissions";

const productInput=z.object({organizationId:z.string().uuid(),storeId:z.string().uuid(),vendorId:z.string().uuid(),sku:z.string().trim().min(1).max(80),barcode:z.string().trim().max(100).optional(),name:z.string().trim().min(2).max(160),description:z.string().trim().max(1000).optional(),price:z.coerce.number().positive().max(1000000),taxCode:z.enum(["standard","zero","exempt"]),initialQuantity:z.coerce.number().int().min(0).max(1000000)});
const adjustmentInput=z.object({organizationId:z.string().uuid(),productId:z.string().uuid(),quantityDelta:z.coerce.number().int().min(-1000000).max(1000000).refine(v=>v!==0),reason:z.enum(["received","correction","damaged","returned","vendor_removed"])});

async function inventoryContext(organizationId:string){
  const session=await requireSession();
  const [membership]=await db.select().from(memberships).where(and(eq(memberships.userId,session.user.id),eq(memberships.organizationId,organizationId),eq(memberships.status,"active"))).limit(1);
  if(!membership)redirect("/app");return{session,membership,role:membership.role as Role};
}

export async function createProduct(formData:FormData){
  const parsed=productInput.safeParse(Object.fromEntries(formData));if(!parsed.success)redirect("/app/inventory?error=product");
  const {session,membership,role}=await inventoryContext(parsed.data.organizationId);
  const canWrite=hasPermission(role,"inventory:write",membership.permissions)||hasPermission(role,"own_inventory:write",membership.permissions);if(!canWrite)redirect("/app/inventory");
  const vendorId=role==="vendor"?membership.vendorId:parsed.data.vendorId;if(!vendorId)redirect("/app/inventory?error=vendor");
  const [vendor]=await db.select().from(vendors).where(and(eq(vendors.id,vendorId),eq(vendors.organizationId,parsed.data.organizationId),eq(vendors.storeId,parsed.data.storeId))).limit(1);
  const [store]=await db.select().from(stores).where(and(eq(stores.id,parsed.data.storeId),eq(stores.organizationId,parsed.data.organizationId))).limit(1);
  if(!vendor||!store||membership.storeId&&membership.storeId!==store.id)redirect("/app/inventory?error=scope");
  try{await db.transaction(async tx=>{const [product]=await tx.insert(products).values({organizationId:parsed.data.organizationId,storeId:store.id,vendorId:vendor.id,sku:parsed.data.sku,barcode:parsed.data.barcode||null,name:parsed.data.name,description:parsed.data.description||null,priceCents:Math.round(parsed.data.price*100),taxCode:parsed.data.taxCode}).returning();if(parsed.data.initialQuantity>0)await tx.insert(inventoryMovements).values({organizationId:parsed.data.organizationId,storeId:store.id,productId:product.id,quantityDelta:parsed.data.initialQuantity,reason:"initial_stock",createdBy:session.user.id});await tx.insert(auditLog).values({organizationId:parsed.data.organizationId,storeId:store.id,actorUserId:session.user.id,action:"product.created",entityType:"product",entityId:product.id});});}catch{redirect("/app/inventory?error=product");}
  revalidatePath("/app/inventory");revalidatePath("/vendor");
}

export async function adjustInventory(formData:FormData){
  const parsed=adjustmentInput.safeParse(Object.fromEntries(formData));if(!parsed.success)redirect("/app/inventory?error=adjustment");
  const {session,membership,role}=await inventoryContext(parsed.data.organizationId);const canAll=hasPermission(role,"inventory:write",membership.permissions);const canOwn=hasPermission(role,"own_inventory:write",membership.permissions);
  if(!canAll&&!canOwn)redirect("/app/inventory");
  try{await db.transaction(async tx=>{await tx.execute(sql`select id from ${products} where id=${parsed.data.productId} for update`);const [product]=await tx.select().from(products).where(and(eq(products.id,parsed.data.productId),eq(products.organizationId,parsed.data.organizationId))).limit(1);if(!product||membership.storeId&&membership.storeId!==product.storeId||!canAll&&product.vendorId!==membership.vendorId)throw new Error("Out of scope");const [balance]=await tx.select({quantity:sql<number>`coalesce(sum(${inventoryMovements.quantityDelta}),0)`}).from(inventoryMovements).where(eq(inventoryMovements.productId,product.id));if(Number(balance.quantity)+parsed.data.quantityDelta<0)throw new Error("Insufficient stock");await tx.insert(inventoryMovements).values({organizationId:product.organizationId,storeId:product.storeId,productId:product.id,quantityDelta:parsed.data.quantityDelta,reason:parsed.data.reason,createdBy:session.user.id});await tx.insert(auditLog).values({organizationId:product.organizationId,storeId:product.storeId,actorUserId:session.user.id,action:"inventory.adjusted",entityType:"product",entityId:product.id,payload:{quantityDelta:parsed.data.quantityDelta,reason:parsed.data.reason}});});}catch{redirect("/app/inventory?error=adjustment");}
  revalidatePath("/app/inventory");revalidatePath("/vendor");
}
