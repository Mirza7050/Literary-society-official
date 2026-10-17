
const SUPABASE_URL = "https://uyiiaqihliptuqhdfxjt.supabase.co";

// Paste your existing Supabase publishable/anon key here.
// Never use your service_role or secret key in frontend code.
const SUPABASE_KEY = "sb_publishable_Fw1MWY3K6zhxlPGIXaSXEQ_0UfMwoku";

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

const loginPanel = document.getElementById("loginPanel");
const dashboardPanel = document.getElementById("dashboardPanel");
const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");
const dashboardMessage = document.getElementById("dashboardMessage");
const applicationsBody = document.getElementById("applicationsBody");

let applications = [];

function showMessage(element, message, isError = true) {
  element.textContent = message;
  element.style.color = isError ? "#9a3c30" : "#24734b";
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function showLogin() {
  loginPanel.hidden = false;
  dashboardPanel.hidden = true;
}

function showDashboard() {
  loginPanel.hidden = true;
  dashboardPanel.hidden = false;
}

loginForm.addEventListener("submit", async event => {
  event.preventDefault();

  const button = document.getElementById("loginButton");
  button.disabled = true;
  showMessage(loginMessage, "Signing in…", false);

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  const { error } = await db.auth.signInWithPassword({ email, password });

  button.disabled = false;

  if (error) {
    showMessage(loginMessage, "Sign-in failed. Check your email, password, and Supabase Auth settings.");
    return;
  }

  await checkAdminAndLoad();
});

document.getElementById("logoutButton").addEventListener("click", async () => {
  await db.auth.signOut();
  applications = [];
  showLogin();
  showMessage(loginMessage, "You have signed out.", false);
});

document.getElementById("refreshButton").addEventListener("click", loadApplications);
document.getElementById("searchInput").addEventListener("input", renderApplications);
document.getElementById("typeFilter").addEventListener("change", renderApplications);

async function checkAdminAndLoad() {
  const { data: { user } } = await db.auth.getUser();

  if (!user) {
    showLogin();
    return;
  }

  // This query succeeds only if the signed-in user is allowed by RLS.
  const { data, error } = await db
    .from("tls_applications")
    .select("id, application_type, full_name, email, phone, roll_number, academic_year, branch, section, position, resume_path, profile_links, prior_leadership, experience_skills, interview_slot, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    showLogin();
    showMessage(
      loginMessage,
      "Your account could not access applications. Confirm that its user UUID is listed in tls_admins and the admin RLS policies are enabled."
    );
    await db.auth.signOut();
    return;
  }

  applications = data || [];
  showDashboard();
  showMessage(dashboardMessage, "Applications loaded successfully.", false);
  renderApplications();
}

async function loadApplications() {
  showMessage(dashboardMessage, "Refreshing…", false);

  const { data, error } = await db
    .from("tls_applications")
    .select("id, application_type, full_name, email, phone, roll_number, academic_year, branch, section, position, resume_path, profile_links, prior_leadership, experience_skills, interview_slot, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    showMessage(dashboardMessage, "Could not refresh applications. Please sign in again.");
    return;
  }

  applications = data || [];
  showMessage(dashboardMessage, "Applications refreshed.", false);
  renderApplications();
}

function renderApplications() {
  const search = document.getElementById("searchInput").value.trim().toLowerCase();
  const type = document.getElementById("typeFilter").value;

  const filtered = applications.filter(app => {
    const matchesType = type === "all" || app.application_type === type;
    const searchText = [
      app.full_name, app.email, app.roll_number, app.branch, app.position
    ].join(" ").toLowerCase();

    return matchesType && searchText.includes(search);
  });

  document.getElementById("totalCount").textContent = applications.length;
  document.getElementById("membershipCount").textContent =
    applications.filter(app => app.application_type === "membership").length;
  document.getElementById("leadershipCount").textContent =
    applications.filter(app => app.application_type === "leadership").length;

  if (!filtered.length) {
    applicationsBody.innerHTML =
      '<tr><td colspan="6" class="empty">No matching applications found.</td></tr>';
    return;
  }

  applicationsBody.innerHTML = filtered.map(app => {
    const submitted = app.created_at
      ? new Date(app.created_at).toLocaleString()
      : "—";

    const academic = [
      app.academic_year,
      app.branch,
      app.section,
      app.roll_number
    ].filter(Boolean).map(escapeHTML).join("<br>");

    const typeLabel = app.application_type === "leadership"
      ? "Leadership"
      : "Membership";

    return `
      <tr>
        <td>
          <strong>${escapeHTML(app.full_name)}</strong><br>
          <span>${escapeHTML(app.email)}</span>
        </td>
        <td>
          ${escapeHTML(typeLabel)}<br>
          ${escapeHTML(app.position || "—")}
        </td>
        <td>${academic || "—"}</td>
        <td>
          ${escapeHTML(app.phone || "—")}<br>
          ${escapeHTML(app.profile_links || "")}
        </td>
        <td>${escapeHTML(submitted)}</td>
        <td>
          ${app.resume_path
            ? `<button class="resume-button" data-resume="${escapeHTML(app.resume_path)}">Download</button>`
            : "No resume"}
        </td>
      </tr>
    `;
  }).join("");
}

applicationsBody.addEventListener("click", async event => {
  const button = event.target.closest("[data-resume]");
  if (!button) return;

  const path = button.dataset.resume;
  button.disabled = true;
  button.textContent = "Loading…";

  const { data, error } = await db.storage
    .from("tls-resumes")
    .createSignedUrl(path, 60);

  button.disabled = false;
  button.textContent = "Download";

  if (error || !data?.signedUrl) {
    showMessage(dashboardMessage, "Could not access this resume. Check the Storage admin SELECT policy and saved file path.");
    return;
  }

  window.open(data.signedUrl, "_blank", "noopener,noreferrer");
});

db.auth.onAuthStateChange((event, session) => {
  if (event === "SIGNED_OUT" || !session) {
    showLogin();
  }
});

(async function init() {
  const { data: { session } } = await db.auth.getSession();

  if (session) {
    await checkAdminAndLoad();
  } else {
    showLogin();
  }
})();
