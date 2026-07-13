import postgres from "postgres";

if(process.env.SECURITY_ENFORCE_RLS!=="true")throw new Error("Set SECURITY_ENFORCE_RLS=true after enabling RLS");
if(!process.env.DATABASE_URL)throw new Error("DATABASE_URL must use the vndrhub_app role");
const client=postgres(process.env.DATABASE_URL,{max:1,prepare:false});
try{
  const organizations=await client`select id from organizations order by created_at limit 2`;
  if(organizations.length<2)throw new Error("Create two isolated test organizations before running this verification");
  const [first,second]=organizations;
  await client.begin(async tx=>{
    await tx`select set_config('app.organization_id', ${first.id}, true)`;
    const own=await tx`select id from organizations`;
    const other=await tx`select id from organizations where id=${second.id}`;
    if(own.length!==1||own[0].id!==first.id||other.length!==0)throw new Error("Organization RLS isolation failed");
  });
  console.log("RLS organization isolation verification passed.");
}finally{await client.end();}
