import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { organizations, stores, vendors } from "@/db/schema";
import { requirePlatformAdmin } from "@/lib/access";
import { PlatformMfaSetup } from "@/components/platform-mfa-setup";

export default async function PlatformPage(){
  const {session}=await requirePlatformAdmin();
  const customers=await db.select({id:organizations.id,name:organizations.name,plan:organizations.plan,status:organizations.status,createdAt:organizations.createdAt,storeCount:sql<number>`count(distinct ${stores.id})`,vendorCount:sql<number>`count(distinct ${vendors.id})`}).from(organizations).leftJoin(stores,eq(stores.organizationId,organizations.id)).leftJoin(vendors,eq(vendors.organizationId,organizations.id)).groupBy(organizations.id).orderBy(desc(organizations.createdAt));
  return <main className="management-shell"><header><div><p className="eyebrow">VNDR HUB ADMIN</p><h1>Platform overview</h1><p className="muted">Signed in as {session.user.email}. This view spans every customer organization.</p></div><a className="quiet-button" href="/app">Customer app</a></header><section className="metric-grid"><article><span>Organizations</span><b>{customers.length}</b></article><article><span>Storefronts</span><b>{customers.reduce((sum,item)=>sum+Number(item.storeCount),0)}</b></article><article><span>Active vendors</span><b>{customers.reduce((sum,item)=>sum+Number(item.vendorCount),0)}</b></article></section>{!session.user.twoFactorEnabled&&<PlatformMfaSetup/>}<section className="management-card"><h2>Customer accounts</h2><div className="data-list">{customers.map(customer=><div key={customer.id}><span><b>{customer.name}</b><small>{customer.status}</small></span><span><b className="capitalize">{customer.plan}</b><small>{customer.storeCount} stores, {customer.vendorCount} vendors</small></span></div>)}</div></section></main>;
}
