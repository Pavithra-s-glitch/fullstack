const app = document.getElementById("app");
const nav = document.getElementById("nav");
let me = null;
let toastTimer;

function toast(message, error=false) {
  const el = document.getElementById("toast");
  el.textContent = message;
  el.className = "toast show" + (error ? " error" : "");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.className = "toast", 3200);
}
async function api(path, options={}) {
  const config = { credentials:"same-origin", ...options, headers: { ...(options.headers||{}) } };
  if (options.body && typeof options.body !== "string") {
    config.headers["Content-Type"] = "application/json";
    config.body = JSON.stringify(options.body);
  }
  const response = await fetch("/api" + path, config);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}
function updateNav() {
  if (!me) {
    nav.innerHTML = `<a href="#" onclick="showPage('login');return false">Sign in</a><a class="nav-cta" href="#" onclick="showPage('register');return false">Get started</a>`;
  } else {
    nav.innerHTML = `<a href="#" onclick="showPage('dashboard');return false">Dashboard</a><a href="#" onclick="showPage('opportunities');return false">Opportunities</a><a href="#" onclick="showPage('events');return false">Events</a>${me.role==="admin"?`<a href="#" onclick="showPage('admin');return false">Admin</a>`:""}<a class="nav-cta" href="#" onclick="logout();return false">Log out</a>`;
  }
}
function shell(content) { app.innerHTML = content; }
function authPage(register=false) {
  shell(`<section class="auth-shell"><div class="auth-aside"><span class="eyebrow">CAMPUSCONNECT ACCOUNT</span><h1>${register?"Your campus journey starts here.":"Welcome back to your campus."}</h1><p>${register?"Create your student account to explore opportunities, campus events and important updates.":"Sign in to continue discovering opportunities and staying connected with campus life."}</p><p>✦ &nbsp; One portal. More possibilities.</p></div><div class="auth-card"><h2>${register?"Create your account":"Sign in"}</h2><p class="subtext">${register?"Enter your details to join CampusConnect.":"Enter your registered email and password."}</p><form id="auth-form">
    ${register?`<div class="field"><label>Full name</label><input name="name" required placeholder="Your full name"></div>`:""}
    <div class="field"><label>Email address</label><input name="email" type="email" required placeholder="you@college.edu"></div>
    ${register?`<div class="field"><label>Department</label><select name="department" required><option value="">Choose department</option><option>Computer Science</option><option>Information Technology</option><option>Electronics</option><option>Mechanical</option><option>Civil</option><option>Other</option></select></div><div class="field"><label>Academic year</label><select name="year" required><option value="">Choose year</option><option>1st Year</option><option>2nd Year</option><option>3rd Year</option><option>4th Year</option></select></div>`:""}
    <div class="field"><label>Password</label><input name="password" type="password" minlength="6" required placeholder="At least 6 characters"></div>
    <button class="btn" type="submit">${register?"Create account":"Sign in"} →</button></form>
    <p class="switch-auth">${register?"Already have an account?":"New to CampusConnect?"} <a onclick="showPage('${register?"login":"register"}')">${register?"Sign in":"Create an account"}</a></p>
    ${register?"":`<p class="subtext" style="margin-top:18px">Demo admin: admin@campusconnect.com · Password: admin123</p>`}</div></section>`);
  document.getElementById("auth-form").addEventListener("submit", async e=>{
    e.preventDefault();
    const form = Object.fromEntries(new FormData(e.target).entries());
    try {
      const data = await api(register?"/register":"/login",{method:"POST",body:form});
      me = data.user; updateNav(); toast(data.message); showPage("dashboard");
    } catch(err) { toast(err.message,true); }
  });
}
async function dashboardPage() {
  shell(`<div class="app-layout"><div class="page-title"><div><span class="eyebrow">STUDENT PORTAL</span><h1 id="greeting">Your dashboard</h1><p>Your campus activity, all in one place.</p></div><button class="btn" onclick="showPage('opportunities')">Explore opportunities →</button></div><div id="dash-content">Loading your dashboard...</div></div>`);
  try {
    const d=await api("/dashboard");
    document.getElementById("greeting").textContent=`Hello, ${me.name} 👋`;
    document.getElementById("dash-content").innerHTML=`<div class="stats-grid">
      <div class="stat-card"><small>Registered students</small><b>${d.stats.students}</b></div>
      <div class="stat-card"><small>Opportunities</small><b>${d.stats.opportunities}</b></div>
      <div class="stat-card"><small>Campus events</small><b>${d.stats.events}</b></div>
      <div class="stat-card"><small>My applications</small><b>${d.stats.my_applications}</b></div></div>
      <div class="dash-grid"><section class="content-card"><h2>Latest opportunities</h2>${d.latest_opportunities.map(o=>`<div class="list-row"><b>${esc(o.title)}</b><p>${esc(o.company)} · Apply before ${esc(o.deadline)}</p></div>`).join("")||`<p class="empty">No opportunities yet.</p>`}</section>
      <section class="content-card"><h2>Campus announcements</h2>${d.announcements.map(a=>`<div class="list-row"><b>${esc(a.title)}</b><p>${esc(a.message)}</p></div>`).join("")||`<p class="empty">No announcements yet.</p>`}</section></div>`;
  } catch(err) { toast(err.message,true); }
}
async function opportunitiesPage() {
  shell(`<div class="app-layout"><div class="page-title"><div><span class="eyebrow">TAKE THE NEXT STEP</span><h1>Career opportunities</h1><p>Explore internships, jobs and ways to grow your skills.</p></div></div><div id="op-list" class="cards-grid">Loading opportunities...</div></div>`);
  try {
    const d=await api("/opportunities");
    document.getElementById("op-list").innerHTML=d.opportunities.map(o=>`<article class="op-card"><span class="pill">${esc(o.category)}</span><h3>${esc(o.title)}</h3><b>${esc(o.company)}</b><p>${esc(o.description)}</p><p>Apply before: <b>${esc(o.deadline)}</b></p>${me.role==="student"?(o.application_id?`<button class="btn" disabled>Application submitted ✓</button>`:`<button class="btn" onclick="applyFor(${o.id})">Apply now →</button>`):""}</article>`).join("")||`<p class="empty">No opportunities have been posted.</p>`;
  } catch(err) { toast(err.message,true); }
}
async function applyFor(id) {
  try { const d=await api(`/opportunities/${id}/apply`,{method:"POST"});toast(d.message);opportunitiesPage(); }
  catch(err){toast(err.message,true);}
}
async function eventsPage() {
  shell(`<div class="app-layout"><div class="page-title"><div><span class="eyebrow">CAMPUS LIFE</span><h1>Events & workshops</h1><p>What's happening around your campus.</p></div></div><div id="event-list" class="cards-grid">Loading events...</div></div>`);
  try {
    const d=await api("/events");
    document.getElementById("event-list").innerHTML=d.events.map(e=>`<article class="event-card"><span class="pill">CAMPUS EVENT</span><h3>${esc(e.title)}</h3><p>▦ &nbsp; ${esc(e.event_date)}</p><p>⌖ &nbsp; ${esc(e.venue)}</p><p>${esc(e.description)}</p></article>`).join("")||`<p class="empty">No events announced yet.</p>`;
  } catch(err){toast(err.message,true);}
}
async function adminPage() {
  shell(`<div class="app-layout"><div class="page-title"><div><span class="eyebrow">PORTAL MANAGEMENT</span><h1>Admin dashboard</h1><p>Manage students, opportunities, events and campus updates.</p></div></div><div id="admin-stats" class="stats-grid"></div>
  <div class="admin-grid">
    <section class="admin-panel"><h2>＋ Add opportunity</h2><form id="op-form"><label>Title</label><input name="title" required><label>Company</label><input name="company" required><label>Category</label><select name="category"><option>Internship</option><option>Full-time</option><option>Workshop</option></select><label>Description</label><textarea name="description" required></textarea><label>Deadline</label><input type="date" name="deadline" required><button class="btn">Publish opportunity</button></form></section>
    <section class="admin-panel"><h2>▦ Add campus event</h2><form id="event-form"><label>Event title</label><input name="title" required><label>Date</label><input type="date" name="event_date" required><label>Venue</label><input name="venue" required><label>Description</label><textarea name="description" required></textarea><button class="btn">Publish event</button></form></section>
    <section class="admin-panel"><h2>✦ Post announcement</h2><form id="announcement-form"><label>Announcement title</label><input name="title" required><label>Message</label><textarea name="message" required></textarea><button class="btn">Post announcement</button></form></section>
  </div><section class="content-card"><h2>Registered students</h2><div id="students-table" class="table-wrap">Loading...</div></section><section class="content-card" style="margin-top:17px"><h2>Student applications</h2><div id="applications-table" class="table-wrap">Loading...</div></section></div>`);
  try {
    const [s,students,apps]=await Promise.all([api("/admin/summary"),api("/admin/students"),api("/admin/applications")]);
    document.getElementById("admin-stats").innerHTML=[["Students",s.students],["Opportunities",s.opportunities],["Applications",s.applications],["Events",s.events]].map(x=>`<div class="stat-card"><small>${x[0]}</small><b>${x[1]}</b></div>`).join("");
    document.getElementById("students-table").innerHTML=table(["Name","Email","Department","Year"],students.students.map(x=>[x.name,x.email,x.department,x.year]));
    document.getElementById("applications-table").innerHTML=table(["Student","Opportunity","Status","Applied on"],apps.applications.map(x=>[x.student_name,x.opportunity_title,x.status,x.applied_at]));
    bindAdminForm("op-form","/admin/opportunities");bindAdminForm("event-form","/admin/events");bindAdminForm("announcement-form","/admin/announcements");
  } catch(err){toast(err.message,true);}
}
function table(headers, rows) {
  if(!rows.length)return `<p class="empty">No records to display yet.</p>`;
  return `<table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(v=>`<td>${esc(v??"")}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}
function bindAdminForm(id,path) {
  document.getElementById(id).addEventListener("submit",async e=>{
    e.preventDefault();const body=Object.fromEntries(new FormData(e.target).entries());
    try{const d=await api(path,{method:"POST",body});toast(d.message);e.target.reset();adminPage();}
    catch(err){toast(err.message,true);}
  });
}
function esc(value) {
  return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
async function logout() {
  try{await api("/logout",{method:"POST"});}catch(e){}
  me=null;updateNav();toast("You have logged out.");showPage("home");
}
async function showPage(page) {
  if(["dashboard","opportunities","events","admin"].includes(page) && !me){authPage(false);return;}
  if(page==="home"){me?dashboardPage():(await fetch("/").catch(()=>null),shell(document.querySelector(".hero")?"":`<section class="hero"><div class="hero-copy"><span class="eyebrow">YOUR CAMPUS. YOUR FUTURE.</span><h1>Make your campus life <span>count.</span></h1><p>One connected place to manage your student journey, discover career opportunities and stay close to everything happening on campus.</p><div class="hero-actions"><button class="btn" onclick="showPage('register')">Create student account →</button><button class="btn btn-light" onclick="showPage('login')">Sign in</button></div></div><div class="hero-visual"><div class="glow"></div><div class="hero-panel"><div class="panel-top">✦ YOUR CAMPUS AT A GLANCE</div><div class="welcome-tile"><div><small>WELCOME TO YOUR NEXT CHAPTER</small><h3>Discover more.<br>Do more.</h3></div><div class="cap">🎓</div></div><div class="preview-row"><b>Find your next opportunity</b></div><div class="preview-row"><b>Stay in the loop</b></div></div></div></section>`));}
  else if(page==="login")authPage(false);
  else if(page==="register")authPage(true);
  else if(page==="dashboard")dashboardPage();
  else if(page==="opportunities")opportunitiesPage();
  else if(page==="events")eventsPage();
  else if(page==="admin"){if(me.role!=="admin"){toast("Admin access only.",true);dashboardPage();}else adminPage();}
}
async function boot() {
  try { const d=await api("/me");me=d.user; }
  catch(e){me=null;}
  updateNav();
  if(me)showPage("dashboard");
}
boot();