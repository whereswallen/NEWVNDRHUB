import {NextRequest,NextResponse} from "next/server";
const attempts=new Map<string,{count:number;resets:number}>();
export function proxy(request:NextRequest){
  const response=NextResponse.next();response.headers.set("X-Content-Type-Options","nosniff");response.headers.set("Referrer-Policy","strict-origin-when-cross-origin");response.headers.set("Permissions-Policy","camera=(), microphone=(), geolocation=()");response.headers.set("X-Frame-Options","DENY");
  if(request.nextUrl.pathname.startsWith("/api/auth/")||request.nextUrl.pathname==="/api/stripe/webhook"){
    const key=`${request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()??"unknown"}:${request.nextUrl.pathname}`;const now=Date.now();const entry=attempts.get(key);const current=!entry||entry.resets<now?{count:1,resets:now+60_000}:{count:entry.count+1,resets:entry.resets};attempts.set(key,current);if(current.count>60)return Response.json({error:"Too many requests"},{status:429,headers:{"Retry-After":String(Math.ceil((current.resets-now)/1000))}});
  }
  return response;
}
export const config={matcher:["/((?!_next/static|_next/image|favicon.ico).*)"]};
