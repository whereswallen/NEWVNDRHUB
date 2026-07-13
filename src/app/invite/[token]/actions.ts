"use server";

import { createHash } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { auditLog, invitations, memberships } from "@/db/schema";
import { requireSession } from "@/lib/current-user";

export async function acceptEmployeeInvitation(formData:FormData){
  const session=await requireSession();
  const token=String(formData.get("token"));
  const tokenHash=createHash("sha256").update(token).digest("hex");
  const [invitation]=await db.select().from(invitations).where(and(eq(invitations.tokenHash,tokenHash),isNull(invitations.acceptedAt),gt(invitations.expiresAt,new Date()))).limit(1);
  if(!invitation||invitation.email.toLowerCase()!==session.user.email.toLowerCase()||!(["manager","staff","vendor"] as string[]).includes(invitation.role)||invitation.role==="vendor"&&!invitation.vendorId) redirect(`/invite/${encodeURIComponent(token)}?error=invalid`);
  await db.transaction(async tx=>{
    await tx.insert(memberships).values({organizationId:invitation.organizationId,storeId:invitation.storeId,userId:session.user.id,role:invitation.role,vendorId:invitation.vendorId});
    await tx.update(invitations).set({acceptedAt:new Date(),updatedAt:new Date()}).where(eq(invitations.id,invitation.id));
    await tx.insert(auditLog).values({organizationId:invitation.organizationId,storeId:invitation.storeId,actorUserId:session.user.id,action:"employee.invitation.accepted",entityType:"membership",payload:{role:invitation.role,email:session.user.email}});
  });
  redirect(invitation.role==="vendor"?"/vendor":"/app");
}
