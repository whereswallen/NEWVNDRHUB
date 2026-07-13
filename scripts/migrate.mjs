import {createHash} from "node:crypto";
import {readdir,readFile} from "node:fs/promises";
import postgres from "postgres";
const databaseUrl=process.env.DATABASE_URL;
if(!databaseUrl)throw new Error("DATABASE_URL is required");
const client=postgres(databaseUrl,{max:1,prepare:false});
await client`select pg_advisory_lock(hashtext('vndrhub-migrations'))`;
try{
  await client`create table if not exists vndrhub_migrations (filename text primary key, checksum text not null, applied_at timestamptz not null default now())`;
  const applied=new Map((await client`select filename, checksum from vndrhub_migrations`).map(row=>[row.filename,row.checksum]));
  const files=(await readdir(new URL("../drizzle/",import.meta.url))).filter(name=>name.endsWith(".sql")).sort();
  for(const filename of files){const contents=await readFile(new URL(`../drizzle/${filename}`,import.meta.url),"utf8"),checksum=createHash("sha256").update(contents).digest("hex");if(applied.has(filename)){if(applied.get(filename)!==checksum)throw new Error(`Applied migration was modified: ${filename}`);continue}const executable=contents.replaceAll("--> statement-breakpoint","");await client.begin(async transaction=>{await transaction.unsafe(executable);await transaction`insert into vndrhub_migrations (filename, checksum) values (${filename}, ${checksum})`});console.log(`Applied ${filename}`)}
}finally{await client`select pg_advisory_unlock(hashtext('vndrhub-migrations'))`;await client.end()}
