import { and, eq, gte, isNull, lt, or } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/db";
import {
  memberships,
  organizations,
  refundItems,
  refunds,
  rentalAssignments,
  saleItems,
  sales,
  vendors,
} from "@/db/schema";
import { requireSession } from "@/lib/current-user";
import { formatCad } from "@/lib/money";
import { hasPermission, Role } from "@/lib/permissions";

function monthRange(value?: string) {
  const valid = /^\d{4}-\d{2}$/.test(value ?? "")
    ? value!
    : new Date().toISOString().slice(0, 7);
  const [year, month] = valid.split("-").map(Number);
  return {
    value: valid,
    start: new Date(Date.UTC(year, month - 1, 1)),
    end: new Date(Date.UTC(year, month, 1)),
  };
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const session = await requireSession();
  const query = await searchParams;
  const range = monthRange(query.month);
  const [context] = await db
    .select({ membership: memberships, organization: organizations })
    .from(memberships)
    .innerJoin(organizations, eq(memberships.organizationId, organizations.id))
    .where(
      and(
        eq(memberships.userId, session.user.id),
        eq(memberships.status, "active"),
      ),
    )
    .limit(1);
  if (
    !context ||
    !hasPermission(
      context.membership.role as Role,
      "payouts:read",
      context.membership.permissions,
    )
  )
    redirect("/app");
  const vendorScope = [eq(vendors.organizationId, context.organization.id)];
  const saleScope = [
    eq(sales.organizationId, context.organization.id),
    gte(sales.completedAt, range.start),
    lt(sales.completedAt, range.end),
  ];
  const refundScope = [
    eq(refunds.organizationId, context.organization.id),
    gte(refunds.createdAt, range.start),
    lt(refunds.createdAt, range.end),
  ];
  if (context.membership.storeId) {
    vendorScope.push(eq(vendors.storeId, context.membership.storeId));
    saleScope.push(eq(sales.storeId, context.membership.storeId));
    refundScope.push(eq(refunds.storeId, context.membership.storeId));
  }
  const vendorRows = await db
    .select()
    .from(vendors)
    .where(and(...vendorScope));
  const sold = await db
    .select({ item: saleItems })
    .from(saleItems)
    .innerJoin(sales, eq(saleItems.saleId, sales.id))
    .where(and(...saleScope));
  const returned = await db
    .select({ item: refundItems })
    .from(refundItems)
    .innerJoin(refunds, eq(refundItems.refundId, refunds.id))
    .where(and(...refundScope));
  const rents = await db
    .select({ assignment: rentalAssignments })
    .from(rentalAssignments)
    .innerJoin(vendors, eq(rentalAssignments.vendorId, vendors.id))
    .where(
      and(
        eq(vendors.organizationId, context.organization.id),
        ...(context.membership.storeId
          ? [eq(vendors.storeId, context.membership.storeId)]
          : []),
        lt(rentalAssignments.startsAt, range.end),
        or(
          isNull(rentalAssignments.endsAt),
          gte(rentalAssignments.endsAt, range.start),
        ),
      ),
    );
  const rows = vendorRows.map((vendor) => {
    const vendorSales = sold.filter((row) => row.item.vendorId === vendor.id);
    const vendorRefunds = returned.filter(
      (row) => row.item.vendorId === vendor.id,
    );
    const gross = vendorSales.reduce(
      (sum, row) => sum + row.item.unitPriceCents * row.item.quantity,
      0,
    );
    const salesTax = vendorSales.reduce(
      (sum, row) => sum + row.item.taxCents,
      0,
    );
    const refundsSubtotal = vendorRefunds.reduce(
      (sum, row) => sum + row.item.subtotalCents,
      0,
    );
    const refundsTax = vendorRefunds.reduce(
      (sum, row) => sum + row.item.taxCents,
      0,
    );
    const commission =
      vendorSales.reduce((sum, row) => sum + row.item.commissionCents, 0) -
      vendorRefunds.reduce((sum, row) => sum + row.item.commissionCents, 0);
    const rent = rents
      .filter((row) => row.assignment.vendorId === vendor.id)
      .reduce((sum, row) => sum + row.assignment.monthlyRentCents, 0);
    return {
      vendor,
      gross,
      refundsSubtotal,
      commission,
      rent,
      net: gross - refundsSubtotal - commission - rent,
      tax: salesTax - refundsTax,
    };
  });
  const totals = rows.reduce(
    (a, r) => ({
      gross: a.gross + r.gross,
      refunds: a.refunds + r.refundsSubtotal,
      commission: a.commission + r.commission,
      rent: a.rent + r.rent,
      net: a.net + r.net,
      tax: a.tax + r.tax,
    }),
    { gross: 0, refunds: 0, commission: 0, rent: 0, net: 0, tax: 0 },
  );
  return (
    <main className="management-shell">
      <header>
        <div>
          <p className="eyebrow">PAYOUT REPORTS</p>
          <h1>Vendor settlement summary</h1>
          <p className="muted">
            Sales and refunds use recorded snapshots. Active rental assignments
            apply one full monthly charge for the selected month.
          </p>
        </div>
        <Link className="quiet-button" href="/app">
          Back
        </Link>
      </header>
      <form className="month-filter">
        <label>
          Reporting month{" "}
          <input type="month" name="month" defaultValue={range.value} />
        </label>
        <button className="quiet-button">Apply</button>
      </form>
      <section className="metric-grid">
        <article>
          <span>Gross merchandise sales</span>
          <b>{formatCad(totals.gross)}</b>
        </article>
        <article>
          <span>Store commission</span>
          <b>{formatCad(totals.commission)}</b>
        </article>
        <article>
          <span>Vendor payouts</span>
          <b>{formatCad(totals.net)}</b>
        </article>
      </section>
      <section className="management-card">
        <div className="report-table">
          <div className="report-head">
            <b>Vendor</b>
            <b>Gross</b>
            <b>Refunds</b>
            <b>Commission</b>
            <b>Rent</b>
            <b>Net payout</b>
          </div>
          {rows.map((row) => (
            <div key={row.vendor.id}>
              <span>
                <b>{row.vendor.businessName}</b>
                <small>{row.vendor.code}</small>
              </span>
              <span>{formatCad(row.gross)}</span>
              <span>{formatCad(row.refundsSubtotal)}</span>
              <span>{formatCad(row.commission)}</span>
              <span>{formatCad(row.rent)}</span>
              <strong>{formatCad(row.net)}</strong>
            </div>
          ))}
        </div>
      </section>
      <p className="muted">
        Customer taxes collected, net of refunded tax: {formatCad(totals.tax)}.
        Review tax and payout reports with a qualified accountant before
        remittance.
      </p>
    </main>
  );
}
