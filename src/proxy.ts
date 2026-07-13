import {NextRequest,NextResponse} from "next/server";
const attempts=new Map<string,{count:number;resets:number}>();
export function proxy(request:NextRequest){
  const response=NextResponse.next();response.headers.set("X-Content-Type-Options","nosniff");response.headers.set("Referrer-Policy","strict-origin-when-cross-origin");response.headers.set("Permissions-Policy","camera=(), microphone=(), geolocation=()");response.headers.set("X-Frame-Options","DENY");response.headers.set("Content-Security-Policy","default-src 'self'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; object-src 'none'; img-src 'self' data: https:; font-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self' https://connect.squareup.com https://connect.squareupsandbox.com https://api.stripe.com; upgrade-insecure-requests");
  if(request.nextUrl.pathname.startsWith("/api/auth/")){
    const now=Date.now();if(attempts.size>10_000)for(const [key,value] of attempts)if(value.resets<now)attempts.delete(key);
    const ip=request.headers.get("cf-connecting-ip")??request.headers.get("x-real-ip")??request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()??"unknown";const key=`${ip}:${request.nextUrl.pathname}`;const entry=attempts.get(key);const current=!entry||entry.resets<now?{count:1,resets:now+60_000}:{count:entry.count+1,resets:entry.resets};attempts.set(key,current);if(current.count>10)return Response.json({error:"Too many requests"},{status:429,headers:{"Retry-After":String(Math.ceil((current.resets-now)/1000))}});
  }
  return response;
}
export const config={matcher:["/((?!_next/static|_next/image|favicon.ico).*)"]};
