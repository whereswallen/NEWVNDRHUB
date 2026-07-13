import { and, desc, eq, gte, isNull, lt, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import {
  inventoryMovements,
  products,
  refundItems,
  refunds,
  rentalAssignments,
  rentalSpaces,
  saleItems,
  sales,
  stores,
  vendors,
} from "@/db/schema";
import { requireVendorAccess } from "@/lib/access";
import { formatCad } from "@/lib/money";
import { SignOutButton } from "@/components/sign-out-button";

export default async function VendorPortalPage() {
  const context = await requireVendorAccess();
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
  );
  const productRows = await db
    .select({
      id: products.id,
      sku: products.sku,
      name: products.name,
      priceCents: products.priceCents,
      status: products.status,
      quantity: sql<number>`coalesce(sum(${inventoryMovements.quantityDelta}),0)`,
    })
    .from(products)
    .leftJoin(inventoryMovements, eq(inventoryMovements.productId, products.id))
    .where(
      and(
        eq(products.vendorId, context.vendor.id),
        eq(products.organizationId, context.organization.id),
        eq(products.storeId, context.store.id),
      ),
    )
    .groupBy(products.id);
  const [rent] = await db
    .select({
      spaceName: rentalSpaces.name,
      monthlyRentCents: rentalAssignments.monthlyRentCents,
    })
    .from(rentalAssignments)
    .innerJoin(rentalSpaces, eq(rentalAssignments.spaceId, rentalSpaces.id))
    .where(
      and(
        eq(rentalAssignments.vendorId, context.vendor.id),
        isNull(rentalAssignments.endsAt),
      ),
    )
    .limit(1);
  const monthSales = await db
    .select({ item: saleItems, sale: sales, productName: products.name })
    .from(saleItems)
    .innerJoin(sales, eq(saleItems.saleId, sales.id))
    .innerJoin(products, eq(saleItems.productId, products.id))
    .where(
      and(
        eq(saleItems.vendorId, context.vendor.id),
        gte(sales.completedAt, start),
        lt(sales.completedAt, end),
      ),
    )
    .orderBy(desc(sales.completedAt));
  const monthRefunds = await db
    .select({ item: refundItems })
    .from(refundItems)
    .innerJoin(refunds, eq(refundItems.refundId, refunds.id))
    .where(
      and(
        eq(refundItems.vendorId, context.vendor.id),
        gte(refunds.createdAt, start),
        lt(refunds.createdAt, end),
      ),
    );
  const gross = monthSales.reduce(
    (sum, row) => sum + row.item.unitPriceCents * row.item.quantity,
    0,
  );
  const refunded = monthRefunds.reduce(
    (sum, row) => sum + row.item.subtotalCents,
    0,
  );
  const commission =
    monthSales.reduce((sum, row) => sum + row.item.commissionCents, 0) -
    monthRefunds.reduce((sum, row) => sum + row.item.commissionCents, 0);
  const rentCents = rent?.monthlyRentCents ?? 0;
  const estimatedPayout = gross - refunded - commission - rentCents;
  return (
    <main className="management-shell">
      <header>
        <div>
          <p className="eyebrow">VENDOR PORTAL</p>
          <h1>{context.vendor.businessName}</h1>
          <p className="muted">
            {context.organization.name} · {context.store.name} · Vendor{" "}
            {context.vendor.code}
          </p>
        </div>
        <div className="header-actions">
          <a className="quiet-button" href="/app/inventory">
            Manage inventory
          </a>
          <a className="quiet-button" href="/vendor/payouts">
            Payout history
          </a>
          <SignOutButton />
        </div>
      </header>
      <section className="metric-grid">
        <article>
          <span>This month’s gross sales</span>
          <b>{formatCad(gross)}</b>
        </article>
        <article>
          <span>Commission after refunds</span>
          <b>{formatCad(commission)}</b>
        </article>
        <article>
          <span>Estimated payout after rent</span>
          <b>{formatCad(estimatedPayout)}</b>
        </article>
      </section>
      {rent && (
        <section className="notice">
          <b>Current rental space</b>
          <p>
            {rent.spaceName} · {formatCad(rent.monthlyRentCents)} monthly rent.
          </p>
        </section>
      )}
      <section className="management-card">
        <h2>Your inventory</h2>
        <p className="muted">
          Only products assigned to your vendor account appear here.
        </p>
        <div className="data-list">
          {productRows.length ? (
            productRows.map((product) => (
              <div key={product.id}>
                <span>
                  <b>{product.name}</b>
                  <small>
                    {product.sku} · {product.status}
                  </small>
                </span>
                <span>
                  <b>{Number(product.quantity)} in stock</b>
                  <small>{formatCad(product.priceCents)}</small>
                </span>
              </div>
            ))
          ) : (
            <p className="muted">No products have been added yet.</p>
          )}
        </div>
      </section>
      <section className="management-card">
        <h2>This month’s sales</h2>
        <div className="data-list">
          {monthSales.length ? (
            monthSales.map(({ item, sale, productName }) => (
              <div key={item.id}>
                <span>
                  <b>{productName}</b>
                  <small>
                    {sale.orderNumber} ·{" "}
                    {sale.completedAt?.toLocaleString("en-CA")} · Qty{" "}
                    {item.quantity}
                  </small>
                </span>
                <span>
                  <b>{formatCad(item.unitPriceCents * item.quantity)}</b>
                  <small>
                    Net before rent: {formatCad(item.vendorNetCents)}
                  </small>
                </span>
              </div>
            ))
          ) : (
            <p className="muted">No sales this month.</p>
          )}
        </div>
        {refunded > 0 && (
          <p className="muted">
            Refunded merchandise this month: {formatCad(refunded)}.
          </p>
        )}
      </section>
    </main>
  );
}
