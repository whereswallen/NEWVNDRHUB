import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { sendEmail } from "@/lib/email";

export const auth = betterAuth({
  appName: "VNDR Hub",
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
    usePlural: true,
    transaction: true,
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    requireEmailVerification: true,
    sendResetPassword: async ({user,url})=>sendEmail({to:user.email,subject:"Reset your VNDR Hub password",heading:"Reset your password",message:"Use the secure link below to choose a new password. If you did not request this, you can ignore this message.",actionLabel:"Reset password",actionUrl:url}),
  },
  emailVerification:{sendOnSignUp:true,autoSignInAfterVerification:true,sendVerificationEmail:async({user,url})=>sendEmail({to:user.email,subject:"Verify your VNDR Hub email",heading:"Verify your email address",message:"Confirm your email address to activate your VNDR Hub account.",actionLabel:"Verify email",actionUrl:url})},
  advanced: {
    database: { generateId: "uuid" },
    useSecureCookies: process.env.NODE_ENV === "production",
  },
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
