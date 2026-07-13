import { createHash } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { headers } from "next/headers";
import Link from "next/link";
import { db } from "@/db";
import { invitations, organizations, stores } from "@/db/schema";
import { auth } from "@/lib/auth";
import { acceptEmployeeInvitation } from "./actions";

export default async function InvitationPage({params,searchParams}:{params:Promise<{token:string}>,searchParams:Promise<{error?:string}>}){
  const {token}=await params;const {error}=await searchParams;
  const tokenHash=createHash("sha256").update(token).digest("hex");
  const [record]=await db.select({invitation:invitations,organization:organizations,store:stores}).from(invitations).innerJoin(organizations,eq(invitations.organizationId,organizations.id)).innerJoin(stores,eq(invitations.storeId,stores.id)).where(and(eq(invitations.tokenHash,tokenHash),isNull(invitations.acceptedAt),gt(invitations.expiresAt,new Date()))).limit(1);
  const session=await auth.api.getSession({headers:await headers()});
  if(!record)return <main className="auth-shell"><section className="auth-card"><div className="wordmark">VNDR <span>Hub</span></div><h1>Invitation unavailable</h1><p className="muted">This invitation has expired, was already used, or was revoked.</p></section></main>;
  const next=`/invite/${token}`;
  return <main className="auth-shell"><section className="auth-card"><div className="wordmark">VNDR <span>Hub</span></div><p className="eyebrow">TEAM INVITATION</p><h1>Join {record.organization.name}</h1><p className="muted">You have been invited as <b className="capitalize">{record.invitation.role}</b> at {record.store.name}.</p>
    {!session?<div className="form-stack"><Link className="primary-button" href={`/sign-in?next=${encodeURIComponent(next)}`}>Sign in to accept</Link><Link className="quiet-button centered" href={`/sign-up?next=${encodeURIComponent(next)}`}>Create an account</Link></div>:session.user.email.toLowerCase()!==record.invitation.email.toLowerCase()?<p className="form-error">Sign in as {record.invitation.email} to accept this invitation.</p>:<form action={acceptEmployeeInvitation} className="form-stack"><input type="hidden" name="token" value={token}/>{error&&<p className="form-error">This invitation could not be accepted.</p>}<button className="primary-button">Accept invitation</button></form>}
  </section></main>;
}
