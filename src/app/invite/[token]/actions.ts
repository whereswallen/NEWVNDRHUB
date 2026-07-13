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
  let destination="/app";
  try{await db.transaction(async tx=>{
    const [invitation]=await tx.update(invitations).set({acceptedAt:new Date(),updatedAt:new Date()}).where(and(eq(invitations.tokenHash,tokenHash),isNull(invitations.acceptedAt),gt(invitations.expiresAt,new Date()))).returning();
    if(!invitation||invitation.email.toLowerCase()!==session.user.email.toLowerCase()||!(["manager","staff","vendor"] as string[]).includes(invitation.role)||invitation.role==="vendor"&&!invitation.vendorId)throw new Error("Invalid invitation");
    await tx.insert(memberships).values({organizationId:invitation.organizationId,storeId:invitation.storeId,userId:session.user.id,role:invitation.role,vendorId:invitation.vendorId});
    await tx.insert(auditLog).values({organizationId:invitation.organizationId,storeId:invitation.storeId,actorUserId:session.user.id,action:"employee.invitation.accepted",entityType:"membership",payload:{role:invitation.role,email:session.user.email}});
    destination=invitation.role==="vendor"?"/vendor":"/app";
  });}catch{redirect(`/invite/${encodeURIComponent(token)}?error=invalid`)}
  redirect(destination);
}
