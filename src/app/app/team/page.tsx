import { and, desc, eq, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { invitations, memberships, organizations, stores, users } from "@/db/schema";
import { requireSession } from "@/lib/current-user";
import { hasPermission, Role } from "@/lib/permissions";
import { createEmployeeInvitation, revokeInvitation } from "./actions";

export default async function TeamPage({searchParams}:{searchParams:Promise<{invitation?:string,error?:string,delivery?:string}>}){
  const session=await requireSession();
  const [context]=await db.select({membership:memberships,organization:organizations}).from(memberships).innerJoin(organizations,eq(memberships.organizationId,organizations.id)).where(and(eq(memberships.userId,session.user.id),eq(memberships.status,"active"))).limit(1);
  if(!context||!hasPermission(context.membership.role as Role,"team:read",context.membership.permissions)) redirect("/app");
  const canManage=hasPermission(context.membership.role as Role,"team:manage",context.membership.permissions);
  const storeRows=await db.select().from(stores).where(eq(stores.organizationId,context.organization.id));
  const team=await db.select({id:memberships.id,name:users.name,email:users.email,role:memberships.role,storeName:stores.name}).from(memberships).innerJoin(users,eq(memberships.userId,users.id)).leftJoin(stores,eq(memberships.storeId,stores.id)).where(eq(memberships.organizationId,context.organization.id));
  const pending=canManage?await db.select().from(invitations).where(and(eq(invitations.organizationId,context.organization.id),isNull(invitations.acceptedAt))).orderBy(desc(invitations.createdAt)):[];
  const query=await searchParams;
  return <main className="management-shell"><header><div><p className="eyebrow">ACCESS CONTROL</p><h1>Team members</h1><p className="muted">Employees can use the POS without receiving owner billing, payout, or subscription access.</p></div><a className="quiet-button" href="/app">Back to overview</a></header>
    {query.invitation&&<section className="notice"><b>{query.delivery==="sent"?"Invitation emailed":"Invitation created, but email delivery failed"}</b>{query.delivery!=="sent"&&<><p>Use this secure link while email is being configured:</p><code>{query.invitation}</code></>}</section>}
    {canManage&&<section className="management-card"><h2>Invite an employee</h2><form action={createEmployeeInvitation} className="inline-form"><input type="hidden" name="organizationId" value={context.organization.id}/><label>Email<input name="email" type="email" required/></label><label>Store<select name="storeId">{storeRows.map(store=><option value={store.id} key={store.id}>{store.name}</option>)}</select></label><label>Access<select name="role"><option value="staff">Staff: POS and read-only inventory</option><option value="manager">Manager: operations and reports</option></select></label><button className="primary-button">Create invitation</button></form></section>}
    <section className="management-card"><h2>Active access</h2><div className="data-list">{team.map(member=><div key={member.id}><span><b>{member.name}</b><small>{member.email}</small></span><span><b className="capitalize">{member.role}</b><small>{member.storeName??"All storefronts"}</small></span></div>)}</div></section>
    {canManage&&pending.length>0&&<section className="management-card"><h2>Pending invitations</h2><div className="data-list">{pending.map(invite=><div key={invite.id}><span><b>{invite.email}</b><small className="capitalize">{invite.role}</small></span><form action={revokeInvitation}><input type="hidden" name="organizationId" value={context.organization.id}/><input type="hidden" name="invitationId" value={invite.id}/><button className="quiet-button">Revoke</button></form></div>)}</div></section>}
  </main>;
}
