"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { auditLog, memberships, organizations, stores } from "@/db/schema";
import { requireSession } from "@/lib/current-user";

const onboardingSchema = z.object({
  organizationName: z.string().trim().min(2).max(100),
  storeName: z.string().trim().min(2).max(100),
  province: z.string().trim().min(2).max(2).transform(value => value.toUpperCase()),
  timezone: z.string().trim().min(3).max(80),
  plan: z.enum(["standard", "unlimited"]),
});

export async function completeOnboarding(formData: FormData) {
  const session = await requireSession();
  const input = onboardingSchema.safeParse(Object.fromEntries(formData));
  if (!input.success) redirect("/onboarding?error=invalid");
  const existing = await db.query.memberships.findFirst({ where: eq(memberships.userId, session.user.id) });
  if (existing) redirect("/app");

  await db.transaction(async tx => {
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    const [organization] = await tx.insert(organizations).values({
      name: input.data.organizationName,
      plan: input.data.plan,
      trialEndsAt,
    }).returning();
    const [store] = await tx.insert(stores).values({
      organizationId: organization.id,
      name: input.data.storeName,
      province: input.data.province,
      timezone: input.data.timezone,
    }).returning();
    await tx.insert(memberships).values({
      organizationId: organization.id,
      storeId: null,
      userId: session.user.id,
      role: "owner",
    });
    await tx.insert(auditLog).values({
      organizationId: organization.id,
      storeId: store.id,
      actorUserId: session.user.id,
      action: "organization.onboarded",
      entityType: "organization",
      entityId: organization.id,
      payload: { plan: input.data.plan },
    });
  });
  redirect("/app");
}
