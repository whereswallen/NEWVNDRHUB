import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { memberships, organizations } from "@/db/schema";
import { requireSession } from "@/lib/current-user";
import { SignOutButton } from "@/components/sign-out-button";

export default async function AppPage(){
  const session=await requireSession();
  const [record]=await db.select({membership:memberships,organization:organizations}).from(memberships).innerJoin(organizations,eq(memberships.organizationId,organizations.id)).where(eq(memberships.userId,session.user.id)).limit(1);
  const membership=record?.membership;
  if(!membership) redirect("/onboarding");
  return <main className="app-shell"><aside><div className="wordmark">VNDR <span>Hub</span></div><nav><a className="active">Overview</a><a>POS</a><a>Vendors</a><a>Inventory</a><a>Reports</a><a>Team</a></nav></aside><section className="app-content"><header><div><p className="eyebrow">STORE OWNER</p><h1>{record.organization.name}</h1></div><SignOutButton/></header><div className="welcome-panel"><p className="eyebrow">WORKSPACE READY</p><h2>Your production account is connected.</h2><p>Authentication, tenant ownership, plan selection, and your first storefront are now persisted in PostgreSQL.</p></div><div className="metric-grid"><article><span>Plan</span><b>{record.organization.plan}</b></article><article><span>Vendor allowance</span><b>{record.organization.plan==="unlimited"?"Unlimited":"40"}</b></article><article><span>Account role</span><b>{membership.role}</b></article></div></section></main>;
}
