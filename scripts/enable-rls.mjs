import postgres from "postgres";

if (process.env.SECURITY_ENFORCE_RLS !== "true") throw new Error("Set SECURITY_ENFORCE_RLS=true only after staging isolation tests pass");
if (!process.env.DATABASE_OWNER_URL) throw new Error("DATABASE_OWNER_URL is required");

const client=postgres(process.env.DATABASE_OWNER_URL,{max:1,prepare:false});
const tables=["organizations","stores","vendors","products","inventory_movements","sales","refunds","payouts","audit_log"];
try {
  for (const table of tables) {
    await client.unsafe(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`);
    await client.unsafe(`ALTER TABLE public.${table} FORCE ROW LEVEL SECURITY`);
  }
  console.log("RLS is now enforced for tenant financial tables.");
} finally { await client.end(); }
