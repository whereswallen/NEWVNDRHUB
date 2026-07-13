"use server";

import { createHash, randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { invitations, memberships, organizations, stores } from "@/db/schema";
import { requireOrganizationPermission } from "@/lib/access";
import { sendInvitationEmail } from "@/lib/email";

const invitationInput=z.object({organizationId:z.string().uuid(),storeId:z.string().uuid(),email:z.string().trim().toLowerCase().email(),role:z.enum(["manager","staff"])});

export async function createEmployeeInvitation(formData:FormData){
  const parsed=invitationInput.safeParse(Object.fromEntries(formData));
  if(!parsed.success) redirect("/app/team?error=invalid");
  const {session}=await requireOrganizationPermission(parsed.data.organizationId,"team:manage");
  const [record]=await db.select({store:stores,organization:organizations}).from(stores).innerJoin(organizations,eq(stores.organizationId,organizations.id)).where(and(eq(stores.id,parsed.data.storeId),eq(stores.organizationId,parsed.data.organizationId))).limit(1);
  if(!record) redirect("/app/team?error=store");
  const token=randomBytes(32).toString("base64url");
  const tokenHash=createHash("sha256").update(token).digest("hex");
  await db.insert(invitations).values({...parsed.data,tokenHash,createdBy:session.user.id,expiresAt:new Date(Date.now()+7*24*60*60*1000)});
  const baseUrl=process.env.NEXT_PUBLIC_APP_URL??"http://localhost:3000";
  const url=`${baseUrl}/invite/${token}`;let delivery="sent";try{await sendInvitationEmail({to:parsed.data.email,organizationName:record.organization.name,storeName:record.store.name,role:parsed.data.role,url})}catch{delivery="failed"}
  redirect(`/app/team?invitation=${encodeURIComponent(url)}&delivery=${delivery}`);
}

export async function revokeInvitation(formData:FormData){
  const invitationId=String(formData.get("invitationId"));
  const organizationId=String(formData.get("organizationId"));
  await requireOrganizationPermission(organizationId,"team:manage");
  await db.delete(invitations).where(and(eq(invitations.id,invitationId),eq(invitations.organizationId,organizationId)));
  revalidatePath("/app/team");
}
