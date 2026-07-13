import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { memberships, organizations, platformAdmins, stores } from "@/db/schema";
import { hasBillingAccess } from "@/lib/billing";
import { requireSession } from "@/lib/current-user";
import { hasPermission, Role } from "@/lib/permissions";

export async function requirePlatformAdmin() {
  const session = await requireSession();
  const configuredEmail = process.env.VNDR_PLATFORM_ADMIN_EMAIL?.trim().toLowerCase();
  const bootstrapAllowed = process.env.NODE_ENV !== "production" && process.env.ALLOW_PLATFORM_ADMIN_BOOTSTRAP === "true";
  if (bootstrapAllowed && configuredEmail && session.user.email.toLowerCase() === configuredEmail) {
    await db.insert(platformAdmins).values({ userId: session.user.id }).onConflictDoNothing();
  }
  const [admin] = await db.select().from(platformAdmins).where(eq(platformAdmins.userId, session.user.id)).limit(1);
  if (!admin) redirect("/app");
  return { session, admin };
}

export async function requireOrganizationAccess(organizationId: string) {
  const session = await requireSession();
  const [membership] = await db.select().from(memberships).where(and(eq(memberships.userId, session.user.id),eq(memberships.organizationId, organizationId),eq(memberships.status,"active"))).limit(1);
  if (!membership) redirect("/app");
  const [organization]=await db.select().from(organizations).where(eq(organizations.id,organizationId)).limit(1);
  if(!organization||!hasBillingAccess(organization))redirect("/app/billing?blocked=1");
  return { session, membership, organization };
}

export async function requireOrganizationPermission(organizationId: string, permission: string) {
  if (permission === "billing:manage") {
    const session = await requireSession();
    const [membership] = await db.select().from(memberships).where(and(eq(memberships.userId, session.user.id),eq(memberships.organizationId, organizationId),eq(memberships.status,"active"))).limit(1);
    if (!membership || !hasPermission(membership.role as Role, permission, membership.permissions)) redirect("/app");
    const [organization]=await db.select().from(organizations).where(eq(organizations.id,organizationId)).limit(1);
    if (!organization || organization.status !== "active") redirect("/app");
    return { session, membership, organization };
  }
  const context = await requireOrganizationAccess(organizationId);
  if (!hasPermission(context.membership.role as Role, permission, context.membership.permissions)) redirect("/app");
  return context;
}

export async function requireStorePermission(organizationId: string, storeId: string, permission: string) {
  const context = await requireOrganizationPermission(organizationId, permission);
  if (context.membership.storeId && context.membership.storeId !== storeId) redirect("/app");
  const [store] = await db.select().from(stores).where(and(
    eq(stores.id, storeId),
    eq(stores.organizationId, organizationId),
    eq(stores.status, "active"),
  )).limit(1);
  if (!store) redirect("/app");
  return { ...context, store };
}
