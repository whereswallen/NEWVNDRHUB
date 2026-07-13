"use server";

import { createHash, randomBytes } from "node:crypto";
import { and, count, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { auditLog, invitations, organizations, rentalAssignments, rentalSpaces, stores, storeTaxComponents, vendors } from "@/db/schema";
import { requireOrganizationPermission } from "@/lib/access";
import { canAddVendor, Plan } from "@/lib/entitlements";
import { sendInvitationEmail } from "@/lib/email";

const storeInput=z.object({organizationId:z.string().uuid(),name:z.string().trim().min(2).max(100),province:z.string().trim().length(2).transform(v=>v.toUpperCase()),timezone:z.string().min(3).max(80)});
const spaceInput=z.object({organizationId:z.string().uuid(),storeId:z.string().uuid(),name:z.string().trim().min(1).max(100),sizeCategory:z.string().trim().max(50).optional(),dimensions:z.string().trim().max(100).optional(),monthlyRent:z.coerce.number().min(0).max(100000)});
const vendorInput=z.object({organizationId:z.string().uuid(),storeId:z.string().uuid(),spaceId:z.string().uuid().optional().or(z.literal("")),code:z.string().trim().min(1).max(30),businessName:z.string().trim().min(2).max(120),email:z.string().trim().toLowerCase().email(),commissionRate:z.coerce.number().min(0).max(100)});
const taxInput=z.object({organizationId:z.string().uuid(),storeId:z.string().uuid(),name:z.enum(["GST","HST","PST","QST"]),rate:z.coerce.number().min(0).max(30),registrationNumber:z.string().trim().max(100).optional()});

export async function createStorefront(formData:FormData){
  const parsed=storeInput.safeParse(Object.fromEntries(formData));if(!parsed.success)redirect("/app/setup?error=store");
  const {session}=await requireOrganizationPermission(parsed.data.organizationId,"store:manage");
  const [store]=await db.insert(stores).values({organizationId:parsed.data.organizationId,name:parsed.data.name,province:parsed.data.province,timezone:parsed.data.timezone}).returning();
  await db.insert(auditLog).values({organizationId:parsed.data.organizationId,storeId:store.id,actorUserId:session.user.id,action:"storefront.created",entityType:"store",entityId:store.id});
  revalidatePath("/app/setup");
}

export async function createRentalSpace(formData:FormData){
  const parsed=spaceInput.safeParse(Object.fromEntries(formData));if(!parsed.success)redirect("/app/setup?error=space");
  const {session}=await requireOrganizationPermission(parsed.data.organizationId,"vendors:write");
  const [store]=await db.select().from(stores).where(and(eq(stores.id,parsed.data.storeId),eq(stores.organizationId,parsed.data.organizationId))).limit(1);if(!store)redirect("/app/setup?error=space");
  const [space]=await db.insert(rentalSpaces).values({storeId:store.id,name:parsed.data.name,sizeCategory:parsed.data.sizeCategory||null,dimensions:parsed.data.dimensions||null,monthlyRentCents:Math.round(parsed.data.monthlyRent*100)}).returning();
  await db.insert(auditLog).values({organizationId:parsed.data.organizationId,storeId:store.id,actorUserId:session.user.id,action:"rental_space.created",entityType:"rental_space",entityId:space.id,payload:{monthlyRentCents:space.monthlyRentCents}});
  revalidatePath("/app/setup");
}

export async function saveTaxComponent(formData:FormData){
  const parsed=taxInput.safeParse(Object.fromEntries(formData));if(!parsed.success)redirect("/app/setup?error=tax");
  const {session}=await requireOrganizationPermission(parsed.data.organizationId,"store:manage");const [store]=await db.select().from(stores).where(and(eq(stores.id,parsed.data.storeId),eq(stores.organizationId,parsed.data.organizationId))).limit(1);if(!store)redirect("/app/setup?error=tax");
  await db.insert(storeTaxComponents).values({storeId:store.id,name:parsed.data.name,rate:String(parsed.data.rate),registrationNumber:parsed.data.registrationNumber||null}).onConflictDoUpdate({target:[storeTaxComponents.storeId,storeTaxComponents.name],set:{rate:String(parsed.data.rate),registrationNumber:parsed.data.registrationNumber||null,status:"active",updatedAt:new Date()}});
  await db.insert(auditLog).values({organizationId:parsed.data.organizationId,storeId:store.id,actorUserId:session.user.id,action:"tax_component.saved",entityType:"store",entityId:store.id,payload:{name:parsed.data.name,rate:parsed.data.rate}});revalidatePath("/app/setup");
}

export async function createVendorAndInvitation(formData:FormData){
  const parsed=vendorInput.safeParse(Object.fromEntries(formData));if(!parsed.success)redirect("/app/setup?error=vendor");
  const {session}=await requireOrganizationPermission(parsed.data.organizationId,"vendors:write");
  const token=randomBytes(32).toString("base64url");const tokenHash=createHash("sha256").update(token).digest("hex");
  try{await db.transaction(async tx=>{
    await tx.execute(sql`select id from ${organizations} where id=${parsed.data.organizationId} for update`);
    const [organization]=await tx.select().from(organizations).where(eq(organizations.id,parsed.data.organizationId)).limit(1);
    const [store]=await tx.select().from(stores).where(and(eq(stores.id,parsed.data.storeId),eq(stores.organizationId,parsed.data.organizationId))).limit(1);
    if(!organization||!store)throw new Error("Invalid tenant scope");
    const [total]=await tx.select({value:count()}).from(vendors).where(and(eq(vendors.organizationId,organization.id),eq(vendors.status,"active")));
    if(!canAddVendor(organization.plan as Plan,total.value))throw new Error("Vendor plan limit reached");
    const [vendor]=await tx.insert(vendors).values({organizationId:organization.id,storeId:store.id,code:parsed.data.code,businessName:parsed.data.businessName,email:parsed.data.email,commissionRate:String(parsed.data.commissionRate)}).returning();
    if(parsed.data.spaceId){
      await tx.execute(sql`select id from ${rentalSpaces} where id=${parsed.data.spaceId} for update`);
      const [space]=await tx.select().from(rentalSpaces).where(and(eq(rentalSpaces.id,parsed.data.spaceId),eq(rentalSpaces.storeId,store.id),eq(rentalSpaces.status,"active"))).limit(1);
      const [occupied]=await tx.select({id:rentalAssignments.id}).from(rentalAssignments).where(and(eq(rentalAssignments.spaceId,parsed.data.spaceId),isNull(rentalAssignments.endsAt))).limit(1);
      if(!space||occupied)throw new Error("Rental space unavailable");
      await tx.insert(rentalAssignments).values({spaceId:space.id,vendorId:vendor.id,monthlyRentCents:space.monthlyRentCents,startsAt:new Date()});
    }
    await tx.insert(invitations).values({organizationId:organization.id,storeId:store.id,vendorId:vendor.id,email:parsed.data.email,role:"vendor",tokenHash,createdBy:session.user.id,expiresAt:new Date(Date.now()+7*24*60*60*1000)});
    await tx.insert(auditLog).values({organizationId:organization.id,storeId:store.id,actorUserId:session.user.id,action:"vendor.created",entityType:"vendor",entityId:vendor.id,payload:{commissionRate:parsed.data.commissionRate,spaceId:parsed.data.spaceId||null}});
  });}catch{redirect("/app/setup?error=vendor");}
  const baseUrl=process.env.NEXT_PUBLIC_APP_URL??"http://localhost:3000";
  const url=`${baseUrl}/invite/${token}`;const [organization]=await db.select().from(organizations).where(eq(organizations.id,parsed.data.organizationId)).limit(1);const [store]=await db.select().from(stores).where(eq(stores.id,parsed.data.storeId)).limit(1);let delivery="sent";try{await sendInvitationEmail({to:parsed.data.email,organizationName:organization.name,storeName:store.name,role:"vendor",url})}catch{delivery="failed"}
  redirect(`/app/setup?vendorInvitation=${encodeURIComponent(url)}&delivery=${delivery}`);
}
