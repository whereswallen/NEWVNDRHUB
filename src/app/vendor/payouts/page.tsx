import { and, desc, eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { payouts } from "@/db/schema";
import { requireVendorAccess } from "@/lib/access";
import { formatCad } from "@/lib/money";

export default async function VendorPayoutsPage(){const context=await requireVendorAccess();const rows=await db.select().from(payouts).where(and(eq(payouts.organizationId,context.membership.organizationId),eq(payouts.vendorId,context.vendor.id))).orderBy(desc(payouts.periodStart));return <main className="management-shell"><header><div><p className="eyebrow">PAYOUT HISTORY</p><h1>{context.vendor.businessName}</h1><p className="muted">Finalized statements do not change when later transactions occur.</p></div><Link className="quiet-button" href="/vendor">Back to portal</Link></header><section className="management-card"><div className="data-list">{rows.length?rows.map(payout=><div key={payout.id}><span><b>{payout.periodStart.toLocaleDateString("en-CA",{year:"numeric",month:"long",timeZone:"UTC"})}</b><small className="capitalize">{payout.status}{payout.paidAt?` · Paid ${payout.paidAt.toLocaleDateString("en-CA")}`:""}</small></span><span><b>{formatCad(payout.netPayoutCents)}</b><small>Gross {formatCad(payout.grossSalesCents)} · Refunds {formatCad(payout.refundsCents)} · Commission {formatCad(payout.commissionCents)} · Rent {formatCad(payout.rentCents)}</small>{payout.paymentReference&&<small>Reference: {payout.paymentReference}</small>}</span></div>):<p className="muted">No finalized payouts yet.</p>}</div></section></main>}
