const escapeHtml=(value:string)=>value.replace(/[&<>'"]/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]!));

export async function sendEmail({to,subject,heading,message,actionLabel,actionUrl}:{to:string;subject:string;heading:string;message:string;actionLabel?:string;actionUrl?:string}){
  const apiKey=process.env.RESEND_API_KEY;const from=process.env.EMAIL_FROM;
  if(!apiKey||!from)throw new Error("Transactional email is not configured");
  const action=actionLabel&&actionUrl?`<p style="margin:28px 0"><a href="${escapeHtml(actionUrl)}" style="background:#c9963b;color:#111827;padding:13px 20px;border-radius:8px;text-decoration:none;font-weight:700">${escapeHtml(actionLabel)}</a></p><p style="font-size:12px;color:#64748b;word-break:break-all">${escapeHtml(actionUrl)}</p>`:"";
  const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${apiKey}`,"Content-Type":"application/json"},body:JSON.stringify({from,to:[to],subject,html:`<div style="background:#f4f1ea;padding:32px;font-family:Arial,sans-serif;color:#172033"><div style="max-width:600px;margin:auto;background:white;border-radius:12px;padding:32px"><p style="font-weight:800;letter-spacing:.08em">VNDR <span style="color:#c9963b">Hub</span></p><h1 style="font-size:25px">${escapeHtml(heading)}</h1><p style="line-height:1.6">${escapeHtml(message)}</p>${action}<p style="margin-top:36px;color:#64748b;font-size:12px">VNDR Hub account notification</p></div></div>`})});
  if(!response.ok)throw new Error(`Email provider rejected request: ${response.status}`);
}

export function sendInvitationEmail(input:{to:string;organizationName:string;storeName:string;role:string;url:string}){return sendEmail({to:input.to,subject:`Invitation to ${input.organizationName}`,heading:`Join ${input.organizationName}`,message:`You have been invited as ${input.role} at ${input.storeName}. This secure invitation expires in seven days.`,actionLabel:"Accept invitation",actionUrl:input.url})}
