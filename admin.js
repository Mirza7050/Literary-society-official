
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


function displayValue(value) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  // Handle JSON objects and arrays returned by Supabase.
  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }

  return String(value);
}

function formatLinks(value) {
  if (!value) return "—";

  let links = [];

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      links = Array.isArray(parsed)
        ? parsed
        : typeof parsed === "object" && parsed !== null
          ? Object.entries(parsed).map(([label, url]) => ({ label, url }))
          : [value];
    } catch {
      links = [value];
    }
  } else if (Array.isArray(value)) {
    links = value;
  } else if (typeof value === "object") {
    links = Object.entries(value).map(([label, url]) => ({
      label,
      url
    }));
  }

  return links.map(item => {
    const url = typeof item === "string"
      ? item
      : item?.url || item?.link || item?.href || "";

    const label = typeof item === "string"
      ? item
      : item?.label || item?.title || url || "Profile";

    const safeUrl = String(url).trim();

    // Only make ordinary HTTP/HTTPS URLs clickable.
    if (/^https?:\/\/[^\s]+$/i.test(safeUrl)) {
      return `<a href="${escapeHTML(safeUrl)}"
        target="_blank" rel="noopener noreferrer">${escapeHTML(label)}</a>`;
    }

    return escapeHTML(label || safeUrl || "—");
  }).join("<br>");
}

function renderApplications() {
  const search = document.getElementById("searchInput").value
    .trim().toLowerCase();

  const type = document.getElementById("typeFilter").value;

  const filtered = applications.filter(app => {
    const matchesType =
      type === "all" || app.application_type === type;

    const searchable = [
      app.full_name,
      app.email,
      app.roll_number,
      app.branch,
      app.section,
      app.position,
      app.experience_skills,
      app.prior_leadership,
      app.profile_links
    ].map(displayValue).join(" ").toLowerCase();

    return matchesType && searchable.includes(search);
  });

  document.getElementById("totalCount").textContent =
    applications.length;

  document.getElementById("membershipCount").textContent =
    applications.filter(app =>
      app.application_type === "membership"
    ).length;

  document.getElementById("leadershipCount").textContent =
    applications.filter(app =>
      app.application_type === "leadership"
    ).length;

  if (!filtered.length) {
    applicationsBody.innerHTML =
      '<tr><td colspan="9" class="empty">No matching applications found.</td></tr>';
    return;
  }

  applicationsBody.innerHTML = filtered.map(app => {
    const submitted = app.created_at
      ? new Date(app.created_at).toLocaleString()
      : "—";

    const academic = [
      ["Year", app.academic_year],
      ["Branch", app.branch],
      ["Section", app.section],
      ["Roll number", app.roll_number]
    ].filter(([, value]) =>
      value !== null && value !== undefined && value !== ""
    ).map(([label, value]) =>
      `<strong>${escapeHTML(label)}:</strong> ${escapeHTML(displayValue(value))}`
    ).join("<br>");

    const typeLabel =
      app.application_type === "leadership"
        ? "Leadership"
        : "Membership";

    const details = [
      ["Prior leadership", app.prior_leadership],
      ["Experience & skills", app.experience_skills]
    ].map(([label, value]) => {
      if (value === null || value === undefined || value === "") {
        return "";
      }

      return `<p><strong>${escapeHTML(label)}:</strong><br>${escapeHTML(displayValue(value))}</p>`;
    }).filter(Boolean).join("");

    return `
      <tr>
        <td>
          <strong>${escapeHTML(displayValue(app.full_name))}</strong><br>
          ${escapeHTML(displayValue(app.email))}
        </td>

        <td>
          ${escapeHTML(typeLabel)}<br>
          <strong>${escapeHTML(displayValue(app.position))}</strong>
        </td>

        <td>${academic || "—"}</td>

        <td>
          ${escapeHTML(displayValue(app.phone))}
        </td>

        <td>${details || "—"}</td>

        <td>${formatLinks(app.profile_links)}</td>

        <td>${escapeHTML(displayValue(app.interview_slot))}</td>

        <td>${escapeHTML(submitted)}</td>

        <td>
          ${app.resume_path
            ? `<button class="resume-button"
                data-resume="${escapeHTML(app.resume_path)}">
                Download
              </button>`
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
