const required=["NEXT_PUBLIC_APP_URL","BETTER_AUTH_URL","BETTER_AUTH_SECRET","VNDR_PLATFORM_ADMIN_EMAIL","EMAIL_FROM","SUPPORT_EMAIL","INTEGRATION_ENCRYPTION_KEY"];
const optionalGroups={email:["RESEND_API_KEY"],stripe:["STRIPE_SECRET_KEY","STRIPE_WEBHOOK_SECRET","STRIPE_STANDARD_PRICE_ID","STRIPE_UNLIMITED_PRICE_ID","STRIPE_STOREFRONT_PRICE_ID"],square:["SQUARE_APPLICATION_ID","SQUARE_APPLICATION_SECRET","SQUARE_WEBHOOK_SIGNATURE_KEY","SQUARE_WEBHOOK_URL"]};
const missing=required.filter(key=>!process.env[key]||process.env[key].includes("replace-with")||process.env[key].includes("example.com"));
if(process.env.NODE_ENV!=="production")missing.push("NODE_ENV=production");
if(!["staging","production"].includes(process.env.DEPLOYMENT_ENV??""))missing.push("DEPLOYMENT_ENV=staging or production");
if(process.env.DEPLOYMENT_ENV==="production"&&process.env.REQUIRE_PLATFORM_ADMIN_MFA!=="true")missing.push("REQUIRE_PLATFORM_ADMIN_MFA=true");
for(const key of ["NEXT_PUBLIC_APP_URL","BETTER_AUTH_URL"])if(process.env[key]&&!process.env[key].startsWith("https://"))missing.push(`${key} must use HTTPS`);
if((process.env.BETTER_AUTH_SECRET??"").length<32)missing.push("BETTER_AUTH_SECRET must contain at least 32 characters");
if(missing.length){console.error("Production configuration is incomplete:\n"+missing.map(item=>`  - ${item}`).join("\n"));process.exit(1)}
for(const [name,keys] of Object.entries(optionalGroups)){if(!process.env[keys[0]]){console.warn(`${name} integration is disabled.`);continue}const missingKeys=keys.filter(key=>!process.env[key]);if(missingKeys.length){console.error(`${name} is only partially configured: ${missingKeys.join(", ")}`);process.exit(1)}}
console.log("Production environment validation passed.");
