"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { authClient } from "@/lib/auth-client";

export function AuthForm({ mode, next = "/app" }: { mode: "sign-in" | "sign-up"; next?: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const signingUp = mode === "sign-up";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const values = new FormData(event.currentTarget);
    const email = String(values.get("email"));
    const password = String(values.get("password"));
    const result = signingUp
      ? await authClient.signUp.email({ name: String(values.get("name")), email, password })
      : await authClient.signIn.email({ email, password });
    setPending(false);
    if (result.error) return setError(result.error.message ?? "We could not complete that request.");
    const destination = next.startsWith("/") && !next.startsWith("//") ? next : "/app";
    router.push(signingUp && destination === "/app" ? "/onboarding" : destination);
    router.refresh();
  }

  return <main className="auth-shell"><section className="auth-card">
    <Link className="wordmark" href="/">VNDR <span>Hub</span></Link>
    <p className="eyebrow">{signingUp ? "START YOUR 14 DAY TRIAL" : "WELCOME BACK"}</p>
    <h1>{signingUp ? "Create your owner account" : "Sign in to your workspace"}</h1>
    <p className="muted">{signingUp ? "Set up your first storefront in the next step." : "Access your stores, staff, vendors, and reports."}</p>
    <form onSubmit={submit} className="form-stack">
      {signingUp && <label>Full name<input name="name" autoComplete="name" required minLength={2}/></label>}
      <label>Email address<input name="email" type="email" autoComplete="email" required/></label>
      <label>Password<input name="password" type="password" autoComplete={signingUp ? "new-password" : "current-password"} required minLength={10}/></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="primary-button" disabled={pending}>{pending ? "Please wait..." : signingUp ? "Create account" : "Sign in"}</button>
    </form>
    <p className="switch-link">{signingUp ? "Already have an account?" : "New to VNDR Hub?"} <Link href={`${signingUp ? "/sign-in" : "/sign-up"}?next=${encodeURIComponent(next)}`}>{signingUp ? "Sign in" : "Create an account"}</Link></p>
  </section></main>;
}
