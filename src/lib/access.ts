import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { memberships, platformAdmins } from "@/db/schema";
import { requireSession } from "@/lib/current-user";
import { hasPermission, Role } from "@/lib/permissions";

export async function requirePlatformAdmin() {
  const session = await requireSession();
  const configuredEmail = process.env.VNDR_PLATFORM_ADMIN_EMAIL?.trim().toLowerCase();
  if (configuredEmail && session.user.email.toLowerCase() === configuredEmail) {
    await db.insert(platformAdmins).values({ userId: session.user.id }).onConflictDoNothing();
  }
  const [admin] = await db.select().from(platformAdmins).where(eq(platformAdmins.userId, session.user.id)).limit(1);
  if (!admin) redirect("/app");
  return { session, admin };
}

export async function requireOrganizationPermission(organizationId: string, permission: string) {
  const session = await requireSession();
  const [membership] = await db.select().from(memberships).where(and(eq(memberships.userId, session.user.id),eq(memberships.organizationId, organizationId),eq(memberships.status,"active"))).limit(1);
  if (!membership || !hasPermission(membership.role as Role, permission, membership.permissions)) redirect("/app");
  return { session, membership };
}
