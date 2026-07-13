const required=["NEXT_PUBLIC_APP_URL","BETTER_AUTH_URL","BETTER_AUTH_SECRET","DATABASE_URL","VNDR_PLATFORM_ADMIN_EMAIL","RESEND_API_KEY","EMAIL_FROM","SUPPORT_EMAIL","STRIPE_SECRET_KEY","STRIPE_WEBHOOK_SECRET","STRIPE_STANDARD_PRICE_ID","STRIPE_UNLIMITED_PRICE_ID","STRIPE_STOREFRONT_PRICE_ID","SQUARE_ACCESS_TOKEN","SQUARE_LOCATION_ID","SQUARE_WEBHOOK_SIGNATURE_KEY","SQUARE_WEBHOOK_URL"];
const missing=required.filter(key=>!process.env[key]||process.env[key].includes("replace-with")||process.env[key].includes("example.com"));
if(process.env.NODE_ENV!=="production")missing.push("NODE_ENV=production");
for(const key of ["NEXT_PUBLIC_APP_URL","BETTER_AUTH_URL"])if(process.env[key]&&!process.env[key].startsWith("https://"))missing.push(`${key} must use HTTPS`);
if((process.env.BETTER_AUTH_SECRET??"").length<32)missing.push("BETTER_AUTH_SECRET must contain at least 32 characters");
if(missing.length){console.error("Production configuration is incomplete:\n"+missing.map(item=>`  - ${item}`).join("\n"));process.exit(1)}
console.log("Production environment validation passed.");
