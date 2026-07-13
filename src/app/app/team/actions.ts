"use server";

import { createHash, randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { invitations, memberships, stores } from "@/db/schema";
import { requireOrganizationPermission } from "@/lib/access";

const invitationInput=z.object({organizationId:z.string().uuid(),storeId:z.string().uuid(),email:z.string().trim().toLowerCase().email(),role:z.enum(["manager","staff"])});

export async function createEmployeeInvitation(formData:FormData){
  const parsed=invitationInput.safeParse(Object.fromEntries(formData));
  if(!parsed.success) redirect("/app/team?error=invalid");
  const {session}=await requireOrganizationPermission(parsed.data.organizationId,"team:manage");
  const [store]=await db.select().from(stores).where(and(eq(stores.id,parsed.data.storeId),eq(stores.organizationId,parsed.data.organizationId))).limit(1);
  if(!store) redirect("/app/team?error=store");
  const token=randomBytes(32).toString("base64url");
  const tokenHash=createHash("sha256").update(token).digest("hex");
  await db.insert(invitations).values({...parsed.data,tokenHash,createdBy:session.user.id,expiresAt:new Date(Date.now()+7*24*60*60*1000)});
  const baseUrl=process.env.NEXT_PUBLIC_APP_URL??"http://localhost:3000";
  redirect(`/app/team?invitation=${encodeURIComponent(`${baseUrl}/invite/${token}`)}`);
}

export async function revokeInvitation(formData:FormData){
  const invitationId=String(formData.get("invitationId"));
  const organizationId=String(formData.get("organizationId"));
  await requireOrganizationPermission(organizationId,"team:manage");
  await db.delete(invitations).where(and(eq(invitations.id,invitationId),eq(invitations.organizationId,organizationId)));
  revalidatePath("/app/team");
}
