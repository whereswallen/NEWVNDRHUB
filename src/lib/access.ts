import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { memberships, organizations, platformAdmins, stores, vendors } from "@/db/schema";
import { hasBillingAccess } from "@/lib/billing";
import { requireSession } from "@/lib/current-user";
import { hasPermission, Role } from "@/lib/permissions";

export async function requireCurrentOrganizationAccess({allowBillingOnly=false}:{allowBillingOnly?:boolean}={}) {
  const session=await requireSession();
  const [context]=await db.select({membership:memberships,organization:organizations}).from(memberships).innerJoin(organizations,eq(memberships.organizationId,organizations.id)).where(and(eq(memberships.userId,session.user.id),eq(memberships.status,"active"))).orderBy(memberships.createdAt).limit(1);
  if(!context)redirect("/onboarding");
  if(!allowBillingOnly&&!hasBillingAccess(context.organization))redirect("/app/billing?blocked=1");
  return {session,...context};
}

export async function requireCurrentOrganizationPermission(permission:string,{allowBillingOnly=false}:{allowBillingOnly?:boolean}={}) {
  const context=await requireCurrentOrganizationAccess({allowBillingOnly});
  if(!hasPermission(context.membership.role as Role,permission,context.membership.permissions))redirect("/app");
  return context;
}

export async function requireVendorAccess() {
  const session=await requireSession();
  const [context]=await db.select({membership:memberships,vendor:vendors,organization:organizations,store:stores}).from(memberships).innerJoin(vendors,eq(memberships.vendorId,vendors.id)).innerJoin(organizations,eq(memberships.organizationId,organizations.id)).innerJoin(stores,eq(memberships.storeId,stores.id)).where(and(eq(memberships.userId,session.user.id),eq(memberships.role,"vendor"),eq(memberships.status,"active"))).orderBy(memberships.createdAt).limit(1);
  if(!context||!hasBillingAccess(context.organization))redirect("/app/billing?blocked=1");
  return {session,...context};
}

export async function requirePlatformAdmin() {
  const session = await requireSession();
  const configuredEmail = process.env.VNDR_PLATFORM_ADMIN_EMAIL?.trim().toLowerCase();
  const bootstrapAllowed = process.env.NODE_ENV !== "production" && process.env.ALLOW_PLATFORM_ADMIN_BOOTSTRAP === "true";
  if (bootstrapAllowed && configuredEmail && session.user.email.toLowerCase() === configuredEmail) {
    await db.insert(platformAdmins).values({ userId: session.user.id }).onConflictDoNothing();
  }
  const [admin] = await db.select().from(platformAdmins).where(eq(platformAdmins.userId, session.user.id)).limit(1);
  if (!admin) redirect("/app");
  if (process.env.REQUIRE_PLATFORM_ADMIN_MFA === "true" && !session.user.twoFactorEnabled) redirect("/app?error=platform_mfa_required");
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
