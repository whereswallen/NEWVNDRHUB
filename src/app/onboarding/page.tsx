import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { memberships } from "@/db/schema";
import { requireSession } from "@/lib/current-user";
import { completeOnboarding } from "./actions";

const provinces=["AB","BC","MB","NB","NL","NS","NT","NU","ON","PE","QC","SK","YT"];
export default async function OnboardingPage({searchParams}:{searchParams:Promise<{error?:string}>}){
  const session=await requireSession();
  const existing=await db.query.memberships.findFirst({where:eq(memberships.userId,session.user.id)});
  if(existing) redirect("/app");
  const {error}=await searchParams;
  return <main className="onboarding-shell"><section className="onboarding-card">
    <p className="eyebrow">OWNER SETUP</p><h1>Open your VNDR Hub workspace</h1><p className="muted">Welcome, {session.user.name}. Your first storefront is included.</p>
    <form action={completeOnboarding} className="form-stack two-column">
      <label>Business name<input name="organizationName" required minLength={2}/></label>
      <label>First storefront name<input name="storeName" required minLength={2}/></label>
      <label>Province<select name="province" defaultValue="ON">{provinces.map(p=><option key={p}>{p}</option>)}</select></label>
      <label>Timezone<select name="timezone" defaultValue="America/Toronto"><option>America/Toronto</option><option>America/Halifax</option><option>America/Winnipeg</option><option>America/Edmonton</option><option>America/Vancouver</option><option>America/St_Johns</option></select></label>
      <fieldset className="plan-picker"><legend>Choose a plan after your 14 day trial</legend>
        <label><input type="radio" name="plan" value="standard" defaultChecked/><span><b>Standard</b><strong>$59 CAD / month</strong><small>Up to 40 active vendors</small></span></label>
        <label><input type="radio" name="plan" value="unlimited"/><span><b>Unlimited</b><strong>$99 CAD / month</strong><small>Unlimited active vendors</small></span></label>
      </fieldset>
      {error&&<p className="form-error">Please review the form and try again.</p>}
      <button className="primary-button">Create my workspace</button>
    </form>
  </section></main>;
}
