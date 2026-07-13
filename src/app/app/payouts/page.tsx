import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { payouts, vendors } from "@/db/schema";
import { requireCurrentOrganizationPermission } from "@/lib/access";
import { formatCad } from "@/lib/money";
import { payoutMonth } from "@/lib/payout-calculations";
import { finalizePayout, markPayoutPaid } from "./actions";

export default async function PayoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; error?: string; finalized?: string }>;
}) {
  const query = await searchParams;
  const range = payoutMonth(query.month);
  const context = await requireCurrentOrganizationPermission("payouts:read");
  const canFinalize = context.membership.role === "owner" || context.membership.role === "platform_admin";
  const vendorScope = [eq(vendors.organizationId, context.organization.id)];
  if (context.membership.storeId)
    vendorScope.push(eq(vendors.storeId, context.membership.storeId));
  const payoutScope = [
    eq(payouts.organizationId, context.organization.id),
    eq(payouts.periodStart, range.start),
    eq(payouts.periodEnd, range.end),
  ];
  if (context.membership.storeId)
    payoutScope.push(eq(payouts.storeId, context.membership.storeId));
  const vendorRows = await db
    .select()
    .from(vendors)
    .where(and(...vendorScope));
  const records = await db
    .select()
    .from(payouts)
    .where(and(...payoutScope));
  return (
    <main className="management-shell">
      <header>
        <div>
          <p className="eyebrow">PAYOUT RECORDS</p>
          <h1>Finalize and pay vendors</h1>
          <p className="muted">
            Finalized totals are permanent accounting snapshots for the selected
            month.
          </p>
        </div>
        <div className="header-actions">
          <Link
            className="quiet-button"
            href={`/app/payouts/export?month=${range.value}`}
          >
            Export CSV
          </Link>
          <Link className="quiet-button" href="/app/reports">
            Preview calculations
          </Link>
          <Link className="quiet-button" href="/app">
            Back
          </Link>
        </div>
      </header>
      <form className="month-filter">
        <label>
          Reporting month{" "}
          <input type="month" name="month" defaultValue={range.value} />
        </label>
        <button className="quiet-button">Apply</button>
      </form>
      {query.error && (
        <p className="form-error">
          The payout action was rejected. It may already be finalized or paid.
        </p>
      )}
      {query.finalized && (
        <section className="notice">
          <b>Payout finalized</b>
        </section>
      )}
      <section className="management-card">
        <div className="data-list">
          {vendorRows.map((vendor) => {
            const payout = records.find((item) => item.vendorId === vendor.id);
            return (
              <div key={vendor.id}>
                <span>
                  <b>{vendor.businessName}</b>
                  <small>{vendor.code}</small>
                </span>
                {payout ? (
                  <span>
                    <b>
                      {formatCad(payout.netPayoutCents)} ·{" "}
                      <span className="capitalize">{payout.status}</span>
                    </b>
                    <small>
                      Gross {formatCad(payout.grossSalesCents)} · Refunds{" "}
                      {formatCad(payout.refundsCents)} · Commission{" "}
                      {formatCad(payout.commissionCents)} · Rent{" "}
                      {formatCad(payout.rentCents)}
                    </small>
                    {canFinalize && payout.status === "finalized" && (
                      <form action={markPayoutPaid} className="payment-form">
                        <input
                          type="hidden"
                          name="organizationId"
                          value={context.organization.id}
                        />
                        <input
                          type="hidden"
                          name="payoutId"
                          value={payout.id}
                        />
                        <select name="paymentMethod">
                          <option value="etransfer">E-transfer</option>
                          <option value="cheque">Cheque</option>
                          <option value="manual">Other manual payment</option>
                          <option value="stripe">Stripe</option>
                        </select>
                        <input
                          name="paymentReference"
                          placeholder="Payment reference"
                          required
                        />
                        <input name="notes" placeholder="Optional notes" />
                        <button className="primary-button">Mark paid</button>
                      </form>
                    )}
                  </span>
                ) : canFinalize ? (
                  <form action={finalizePayout}>
                    <input
                      type="hidden"
                      name="organizationId"
                      value={context.organization.id}
                    />
                    <input type="hidden" name="vendorId" value={vendor.id} />
                    <input type="hidden" name="month" value={range.value} />
                    <button className="primary-button">Finalize payout</button>
                  </form>
                ) : (
                  <span className="muted">Not finalized</span>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
