const ADMIN_SUPABASE_URL="https://uyiiaqihliptuqhdfxjt.supabase.co";
const ADMIN_SUPABASE_KEY="sb_publishable_Fw1MWY3K6zhxlPGIXaSXEQ_0UfMwoku";
const ADMIN_BUCKET="tournament-payment-proofs";
const adminDb=window.supabase.createClient(ADMIN_SUPABASE_URL,ADMIN_SUPABASE_KEY);
const loginPanel=document.getElementById("loginPanel"),dashboard=document.getElementById("dashboard");
const loginMessage=document.getElementById("loginMessage"),dashMessage=document.getElementById("dashMessage");
let allRows=[];
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function msg(el,t){el.textContent=t;}
async function showSession(){
 const {data:{user}}=await adminDb.auth.getUser();
 if(!user){loginPanel.hidden=false;dashboard.hidden=true;return;}
 const {data:admin,error}=await adminDb.from("tournament_admins").select("user_id").eq("user_id",user.id).maybeSingle();
 if(error||!admin){await adminDb.auth.signOut();loginPanel.hidden=false;dashboard.hidden=true;msg(loginMessage,"This account is not authorised for tournament management.");return;}
 loginPanel.hidden=true;dashboard.hidden=false;await loadRegistrations();
}
document.getElementById("loginButton").addEventListener("click",async()=>{
 const email=document.getElementById("adminEmail").value.trim(),password=document.getElementById("adminPassword").value;
 const b=document.getElementById("loginButton");b.disabled=true;b.textContent="SIGNING IN...";
 const {error}=await adminDb.auth.signInWithPassword({email,password});
 b.disabled=false;b.textContent="SIGN IN";
 if(error){msg(loginMessage,error.message);return;}await showSession();
});
document.getElementById("logoutButton").addEventListener("click",async()=>{await adminDb.auth.signOut();await showSession();});
document.getElementById("refreshButton").addEventListener("click",loadRegistrations);
document.getElementById("searchTeams").addEventListener("input",renderRows);
async function loadRegistrations(){
 msg(dashMessage,"Loading registrations...");
 const {data,error}=await adminDb.from("tournament_registrations").select("*").order("created_at",{ascending:false});
 if(error){msg(dashMessage,error.message);return;}
 allRows=data||[];msg(dashMessage,`${allRows.length} registration(s) found.`);renderRows();
}
function renderRows(){
 const q=document.getElementById("searchTeams").value.trim().toLowerCase();
 const rows=allRows.filter(r=>(r.team_name||"").toLowerCase().includes(q));
 const root=document.getElementById("registrationList");
 if(!rows.length){root.innerHTML='<div class="empty">No registrations found.</div>';return;}
 root.innerHTML=rows.map(r=>`<article class="registration" data-id="${esc(r.id)}"><h2>${esc(r.team_name)}</h2><div class="meta">Reference: ${esc(r.id)}<br>Leader: ${esc(r.leader_email)} · ${esc(r.leader_mobile)}<br>Submitted: ${new Date(r.created_at).toLocaleString()}</div><div class="uids">${[1,2,3,4].map(n=>`<div class="uid"><strong>PLAYER ${n}</strong>${esc(r["player_"+n+"_uid"])}</div>`).join("")}</div><span class="status">Payment: ${esc(r.payment_status)}</span><span class="status">Registration: ${esc(r.registration_status)}</span><div class="actions"><button class="action view" data-action="proof">VIEW PAYMENT PROOF</button><select data-field="payment_status"><option value="pending" ${r.payment_status==="pending"?"selected":""}>Payment pending</option><option value="verified" ${r.payment_status==="verified"?"selected":""}>Payment verified</option><option value="rejected" ${r.payment_status==="rejected"?"selected":""}>Payment rejected</option></select><select data-field="registration_status"><option value="pending" ${r.registration_status==="pending"?"selected":""}>Registration pending</option><option value="approved" ${r.registration_status==="approved"?"selected":""}>Registration approved</option><option value="rejected" ${r.registration_status==="rejected"?"selected":""}>Registration rejected</option></select><button class="action" data-action="save">SAVE STATUS</button></div></article>`).join("");
}
document.getElementById("registrationList").addEventListener("click",async e=>{
 const button=e.target.closest("button[data-action]");if(!button)return;
 const card=button.closest(".registration"),id=card.dataset.id,row=allRows.find(r=>r.id===id);if(!row)return;
 button.disabled=true;
 try{
  if(button.dataset.action==="proof"){
   const {data,error}=await adminDb.storage.from(ADMIN_BUCKET).createSignedUrl(row.payment_screenshot_path,60);
   if(error)throw error;window.open(data.signedUrl,"_blank","noopener,noreferrer");
  }else{
   const payment_status=card.querySelector('[data-field="payment_status"]').value;
   const registration_status=card.querySelector('[data-field="registration_status"]').value;
   const {error}=await adminDb.from("tournament_registrations").update({payment_status,registration_status}).eq("id",id);
   if(error)throw error;msg(dashMessage,"Registration status updated.");await loadRegistrations();
  }
 }catch(err){msg(dashMessage,err.message||"Action failed.");}finally{button.disabled=false;}
});
showSession();
