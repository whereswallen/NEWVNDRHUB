import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { auditLog, memberships, organizations, payouts, vendors } from "@/db/schema";
import { auth } from "@/lib/auth";
import { hasBillingAccess } from "@/lib/billing";
import { payoutMonth } from "@/lib/payout-calculations";
import { hasPermission, Role } from "@/lib/permissions";

const csv = (value: unknown) => {
  let safe=String(value ?? "");
  if(/^[=+\-@\t\r]/.test(safe))safe=`'${safe}`;
  return `"${safe.replaceAll('"', '""')}"`;
};
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [membership] = await db
    .select()
    .from(memberships)
    .where(
      and(
        eq(memberships.userId, session.user.id),
        eq(memberships.status, "active"),
      ),
    )
    .limit(1);
  if (
    !membership ||
    !hasPermission(
      membership.role as Role,
      "payouts:read",
      membership.permissions,
    )
  )
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const [organization]=await db.select().from(organizations).where(eq(organizations.id,membership.organizationId)).limit(1);
  if(!organization||!hasBillingAccess(organization))return NextResponse.json({error:"Organization unavailable"},{status:403});
  const range = payoutMonth(
    request.nextUrl.searchParams.get("month") ?? undefined,
  );
  const scope = [
    eq(payouts.organizationId, membership.organizationId),
    eq(payouts.periodStart, range.start),
    eq(payouts.periodEnd, range.end),
  ];
  if (membership.storeId) scope.push(eq(payouts.storeId, membership.storeId));
  const rows = await db
    .select({ payout: payouts, vendor: vendors })
    .from(payouts)
    .innerJoin(vendors, eq(payouts.vendorId, vendors.id))
    .where(and(...scope));
  const lines = [
    [
      "Vendor ID",
      "Vendor",
      "Status",
      "Gross Sales CAD",
      "Refunds CAD",
      "Commission CAD",
      "Rent CAD",
      "Tax Collected CAD",
      "Net Payout CAD",
      "Paid At",
      "Payment Method",
      "Payment Reference",
    ]
      .map(csv)
      .join(","),
    ...rows.map(({ payout, vendor }) =>
      [
        vendor.code,
        vendor.businessName,
        payout.status,
        (payout.grossSalesCents / 100).toFixed(2),
        (payout.refundsCents / 100).toFixed(2),
        (payout.commissionCents / 100).toFixed(2),
        (payout.rentCents / 100).toFixed(2),
        (payout.taxCents / 100).toFixed(2),
        (payout.netPayoutCents / 100).toFixed(2),
        payout.paidAt?.toISOString() ?? "",
        payout.paymentMethod ?? "",
        payout.paymentReference ?? "",
      ]
        .map(csv)
        .join(","),
    ),
  ];
  await db.insert(auditLog).values({organizationId:membership.organizationId,storeId:membership.storeId,actorUserId:session.user.id,action:"payout.csv_exported",entityType:"organization",entityId:membership.organizationId,payload:{month:range.value,rows:rows.length}});
  return new NextResponse(`\ufeff${lines.join("\r\n")}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="vndr-hub-payouts-${range.value}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
