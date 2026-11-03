/* Tournament registration. Uses the existing TLS Supabase project.
   Email verification is completed through the Supabase email link (no OTP input). */
const TOURNAMENT_SUPABASE_URL = "https://uyiiaqihliptuqhdfxjt.supabase.co";
const TOURNAMENT_SUPABASE_KEY = "sb_publishable_Fw1MWY3K6zhxlPGIXaSXEQ_0UfMwoku";
const TOURNAMENT_BUCKET = "tournament-payment-proofs";
const tournamentDb = window.supabase.createClient(TOURNAMENT_SUPABASE_URL, TOURNAMENT_SUPABASE_KEY);

const form = document.getElementById("tournamentForm");
const emailInput = document.getElementById("leaderEmail");
const otpStatus = document.getElementById("otpStatus");
const sendOtpButton = document.getElementById("sendOtp");
const fileInput = document.getElementById("paymentFile");
const previewWrap = document.getElementById("previewWrap");
const previewImage = document.getElementById("paymentPreview");
const message = document.getElementById("formMessage");
let verifiedEmail = null;
let selectedFile = null;
let submitting = false;

function showMessage(text, isSuccess=false) {
  message.textContent = text;
  message.className = "form-message" + (isSuccess ? " success" : "");
}

function setBusy(button, busy, label) {
  button.disabled = busy;
  if (busy) { button.dataset.originalLabel = button.textContent; button.textContent = label; }
  else if (button.dataset.originalLabel) { button.textContent = button.dataset.originalLabel; delete button.dataset.originalLabel; }
}

function setVerifiedEmail(email) {
  verifiedEmail = (email || "").trim().toLowerCase() || null;
  if (verifiedEmail) {
    otpStatus.textContent = "✓ EMAIL VERIFIED";
    otpStatus.style.color = "#9bd3a9";
  } else {
    otpStatus.textContent = "Email verification required";
    otpStatus.style.color = "";
  }
}

function invalidateVerification() {
  setVerifiedEmail(null);
}

emailInput.addEventListener("input", () => {
  if (verifiedEmail && emailInput.value.trim().toLowerCase() !== verifiedEmail) {
    invalidateVerification();
  }
});

// Supabase automatically exchanges the magic-link callback for a session
// when the user returns to this page with the configured redirect URL.
tournamentDb.auth.onAuthStateChange((event, session) => {
  if (session?.user?.email) {
    const signedInEmail = session.user.email.trim().toLowerCase();
    if (signedInEmail === emailInput.value.trim().toLowerCase()) {
      setVerifiedEmail(signedInEmail);
      showMessage("Email verified successfully. You can submit your squad registration.", true);
    } else {
      setVerifiedEmail(null);
      otpStatus.textContent = "A different email is signed in. Enter that email or sign out and verify the team leader email.";
    }
  } else if (event === "SIGNED_OUT") {
    setVerifiedEmail(null);
  }
});

async function restoreEmailVerification() {
  try {
    const { data, error } = await tournamentDb.auth.getSession();
    if (error) throw error;
    const sessionEmail = data.session?.user?.email?.trim().toLowerCase();
    const enteredEmail = emailInput.value.trim().toLowerCase();
    if (sessionEmail && enteredEmail && sessionEmail === enteredEmail) {
      setVerifiedEmail(sessionEmail);
      showMessage("Your email is already verified. You can submit your squad registration.", true);
    }
  } catch (err) {
    console.error("Could not restore the Supabase session:", err);
  }
}
restoreEmailVerification();

sendOtpButton.addEventListener("click", async () => {
  const email = emailInput.value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return showMessage("Enter a valid email address first.");
  }

  setBusy(sendOtpButton, true, "SENDING LINK...");
  showMessage("");

  try {
    const redirectTo = "https://the-literary-society-coral.vercel.app/pubg-registration.html";
    const { error } = await tournamentDb.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: redirectTo
      }
    });
    if (error) throw error;

    setVerifiedEmail(null);
    otpStatus.textContent = "Verification link sent. Check your inbox and spam folder.";
    showMessage("A verification link has been sent to " + email + ". Open it on this device to return here.", true);
  } catch (err) {
    showMessage(err.message || "Could not send the verification link. Please try again.");
  } finally {
    setBusy(sendOtpButton, false);
  }
});

fileInput.addEventListener("change", () => {
  const file = fileInput.files?.[0];
  selectedFile = null;
  previewWrap.hidden = true;
  if (!file) return;
  if (!["image/jpeg","image/png"].includes(file.type)) {
    fileInput.value = "";
    return showMessage("Only JPG, JPEG and PNG images are accepted.");
  }
  if (file.size > 5 * 1024 * 1024) {
    fileInput.value = "";
    return showMessage("The screenshot must be 5 MB or smaller.");
  }
  selectedFile = file;
  previewImage.src = URL.createObjectURL(file);
  document.getElementById("fileName").textContent = file.name;
  previewWrap.hidden = false;
  showMessage("");
});

document.getElementById("removeFile").addEventListener("click", () => {
  fileInput.value = "";
  selectedFile = null;
  previewWrap.hidden = true;
  previewImage.removeAttribute("src");
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (submitting) return;
  showMessage("");
  if (!form.reportValidity()) return;

  const email = emailInput.value.trim().toLowerCase();
  if (!verifiedEmail || verifiedEmail !== email) {
    return showMessage("Open the verification link sent to the team leader's email before submitting.");
  }
  if (!selectedFile) return showMessage("Upload the payment screenshot before submitting.");
  if (!document.getElementById("acceptRules").checked) return showMessage("You must accept the tournament rules.");

  const values = Object.fromEntries(new FormData(form).entries());
  const uids = [values.player_1_uid,values.player_2_uid,values.player_3_uid,values.player_4_uid].map(v=>String(v).trim());
  if (uids.some(v=>!v)) return showMessage("Enter all four player UIDs.");
  if (new Set(uids).size !== 4) return showMessage("Each player must have a different UID.");
  if (!/^[0-9]{10}$/.test(values.leader_mobile.trim())) return showMessage("Enter a valid 10-digit mobile number.");

  submitting = true;
  const submitButton = document.getElementById("submitRegistration");
  setBusy(submitButton, true, "SUBMITTING...");
  let uploadedPath = null;

  try {
    const { data: { user }, error: userError } = await tournamentDb.auth.getUser();
    if (userError || !user) throw new Error("Your verified session has expired. Please open a new verification link.");
    if ((user.email || "").toLowerCase() !== email) {
      throw new Error("The signed-in email does not match the team leader email. Verify the correct email.");
    }

    const extension = selectedFile.type === "image/png" ? "png" : "jpg";
    uploadedPath = `${user.id}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await tournamentDb.storage
      .from(TOURNAMENT_BUCKET)
      .upload(uploadedPath, selectedFile, { contentType: selectedFile.type, upsert: false });
    if (uploadError) throw uploadError;

    const record = {
      user_id: user.id,
      team_name: values.team_name.trim(),
      player_1_uid: uids[0], player_2_uid: uids[1], player_3_uid: uids[2], player_4_uid: uids[3],
      leader_mobile: values.leader_mobile.trim(),
      leader_email: email,
      payment_screenshot_path: uploadedPath,
      payment_status: "pending",
      registration_status: "pending"
    };

    const { data, error } = await tournamentDb
      .from("tournament_registrations")
      .insert(record)
      .select("id,team_name")
      .single();
    if (error) throw error;

    form.hidden = true;
    document.getElementById("successTeam").textContent = data.team_name;
    document.getElementById("successId").textContent = data.id;
    document.getElementById("successPanel").hidden = false;
    document.getElementById("successPanel").scrollIntoView({behavior:"smooth",block:"center"});
  } catch (err) {
    if (uploadedPath) {
      // Best-effort cleanup if the database insert failed.
      await tournamentDb.storage.from(TOURNAMENT_BUCKET).remove([uploadedPath]).catch(()=>{});
    }
    showMessage(err.message || "Registration failed. Please try again.");
  } finally {
    submitting = false;
    setBusy(submitButton, false);
  }
});
