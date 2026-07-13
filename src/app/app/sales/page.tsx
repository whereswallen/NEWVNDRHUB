import { and, desc, eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { sales, stores, users } from "@/db/schema";
import { requireCurrentOrganizationPermission } from "@/lib/access";
import { formatCad } from "@/lib/money";

export default async function SalesPage(){const context=await requireCurrentOrganizationPermission("sales:read");const conditions=[eq(sales.organizationId,context.organization.id)];if(context.membership.storeId)conditions.push(eq(sales.storeId,context.membership.storeId));const rows=await db.select({sale:sales,storeName:stores.name,cashier:users.name}).from(sales).innerJoin(stores,eq(sales.storeId,stores.id)).innerJoin(users,eq(sales.createdBy,users.id)).where(and(...conditions)).orderBy(desc(sales.completedAt)).limit(250);return <main className="management-shell"><header><div><p className="eyebrow">SALES HISTORY</p><h1>Completed transactions</h1><p className="muted">Receipts and refunds remain linked to the original immutable sale.</p></div><Link className="quiet-button" href="/app">Back</Link></header><section className="management-card"><div className="data-list">{rows.length?rows.map(({sale,storeName,cashier})=><Link className="sale-row" key={sale.id} href={`/app/sales/${sale.id}`}><span><b>{sale.orderNumber}</b><small>{sale.completedAt?.toLocaleString("en-CA")} · {storeName} · {cashier}</small></span><span><b>{formatCad(sale.totalCents)}</b><small className="capitalize">{sale.status} · {sale.paymentMethod}</small></span></Link>):<p className="muted">No sales recorded yet.</p>}</div></section></main>}
