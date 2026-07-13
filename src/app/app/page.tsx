import { eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { memberships, organizations } from "@/db/schema";
import { requireSession } from "@/lib/current-user";
import { SignOutButton } from "@/components/sign-out-button";
import { hasPermission, Role } from "@/lib/permissions";

export default async function AppPage(){
  const session=await requireSession();
  const [record]=await db.select({membership:memberships,organization:organizations}).from(memberships).innerJoin(organizations,eq(memberships.organizationId,organizations.id)).where(eq(memberships.userId,session.user.id)).limit(1);
  const membership=record?.membership;
  if(!membership) redirect("/onboarding");
  const role=membership.role as Role;const permits=(permission:string)=>hasPermission(role,permission,membership.permissions);
  const accessMessage=role==="owner"?"You control billing, storefronts, employees, vendors, payouts, and reports.":role==="manager"?"You can manage daily operations and reports, but not subscription billing.":role==="staff"?"Your workspace is focused on checkout, sales history, and inventory lookup.":"You can manage only your own inventory and view your sales and payouts.";
  return <main className="app-shell"><aside><div className="wordmark">VNDR <span>Hub</span></div><nav><Link className="active" href="/app">Overview</Link>{permits("pos:sell")&&<Link href="/app/pos">POS</Link>}{permits("vendors:read")&&<Link href="/app/setup">Retail setup</Link>}{role==="vendor"&&<Link href="/vendor">Vendor portal</Link>}<Link href="/app/inventory">Inventory</Link>{permits("sales:read")&&<Link href="/app/sales">Sales</Link>}{permits("reports:read")&&<Link href="/app/reports">Payout reports</Link>}{permits("payouts:read")&&<Link href="/app/payouts">Payout records</Link>}{permits("team:read")&&<Link href="/app/team">Team</Link>}{permits("billing:manage")&&<Link href="/app/billing">Billing</Link>}</nav></aside><section className="app-content"><header><div><p className="eyebrow">{role.replace("_"," ").toUpperCase()}</p><h1>{record.organization.name}</h1></div><SignOutButton/></header><div className="welcome-panel"><p className="eyebrow">YOUR ACCESS</p><h2>Welcome, {session.user.name}.</h2><p>{accessMessage}</p></div><div className="metric-grid"><article><span>Plan</span><b>{record.organization.plan}</b></article><article><span>Vendor allowance</span><b>{record.organization.plan==="unlimited"?"Unlimited":"40"}</b></article><article><span>Account role</span><b>{membership.role}</b></article></div></section></main>;
}
