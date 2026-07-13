"use client";

import {useState} from "react";
import {authClient} from "@/lib/auth-client";

export function PlatformMfaSetup(){
  const [password,setPassword]=useState("");const [uri,setUri]=useState("");const [codes,setCodes]=useState<string[]>([]);const [code,setCode]=useState("");const [status,setStatus]=useState("");
  async function begin(){const result=await authClient.twoFactor.enable({password,issuer:"VNDR Hub"});if(result.error){setStatus(result.error.message??"Unable to start MFA setup");return}setUri(result.data?.totpURI??"");setCodes(result.data?.backupCodes??[]);setStatus("Add the TOTP URI to an authenticator app, store the recovery codes offline, then verify a code.")}
  async function verify(){const result=await authClient.twoFactor.verifyTotp({code});if(result.error){setStatus(result.error.message??"Verification failed");return}setStatus("MFA is enabled. Refresh this page before enabling REQUIRE_PLATFORM_ADMIN_MFA.")}
  return <section className="management-card"><h2>Platform administrator MFA</h2><p className="muted">Set up TOTP before enforcing platform MFA in production. Store recovery codes outside this server.</p>{!uri?<div className="form-stack"><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password"/></label><button className="primary-button" type="button" onClick={begin} disabled={!password}>Begin MFA setup</button></div>:<div className="form-stack"><label>TOTP URI<textarea readOnly value={uri}/></label><label>Recovery codes<textarea readOnly value={codes.join("\n")}/></label><label>Authenticator code<input inputMode="numeric" value={code} onChange={e=>setCode(e.target.value)} autoComplete="one-time-code"/></label><button className="primary-button" type="button" onClick={verify} disabled={!code}>Verify and enable MFA</button></div>}{status&&<p className="muted">{status}</p>}</section>
}
