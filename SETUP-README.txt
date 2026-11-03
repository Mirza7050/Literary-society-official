TLS PUBG/BGMI TOURNAMENT ADD-ON
================================

WHAT IS INCLUDED
- index.html + style.css: adds the featured tournament promotion to the existing homepage
- pubg-registration.html / .css / .js: public tournament registration page (uses images/logo.jpg)
- pubg-admin.html / .css / .js: separate management dashboard
- pubg-tournament.sql: database, RLS and private Storage setup

IMPORTANT PROJECT SAFETY
These files are designed to be copied into the ROOT of your existing LIT CLUB website folder.
Do not replace index.html, style.css, script.js, admin.html, admin.css, admin.js, or recruitment pages.
The existing Supabase URL and publishable key were read from your uploaded project and reused in the two new JS files.
A publishable/anon key is intended for browser use when RLS is configured correctly. Never use a service-role key in frontend code.

STEP 1 — COPY FILES
Copy all six pubg-* files into the same folder as index.html.
The existing homepage index.html and style.css are updated only to add the featured Squad Showdown card. Existing recruitment/admin functionality is retained. The existing TLS logo is reused from images/logo.jpg.

STEP 2 — CREATE DATABASE + PRIVATE BUCKET
1. Open Supabase Dashboard for the existing project.
2. Open SQL Editor > New query.
3. Paste the full contents of pubg-tournament.sql and run it.
4. Confirm that tournament_registrations and tournament_admins exist.
5. Confirm Storage contains tournament-payment-proofs and that it is PRIVATE.

STEP 3 — CONFIGURE EMAIL OTP
Supabase Dashboard > Authentication > Email:
1. Ensure email sign-in is enabled.
2. In the email template used for sign-in, use the token variable {{ .Token }} so the email contains a numeric OTP rather than only a magic link.
3. Save the template.
4. For production, configure a proper SMTP provider and review Auth rate limits.
5. Test sending and verifying an OTP with an email address you control.
The page uses signInWithOtp() and verifyOtp({ type: "email" }); it does not fake verification in JavaScript.

STEP 4 — CREATE ADMIN ACCESS
1. In Supabase Dashboard > Authentication > Users, create the management user's account with email and password.
2. Confirm/verify that account as required by your Auth settings.
3. Copy the user's UUID.
4. In SQL Editor run:
   insert into public.tournament_admins (user_id) values ('PASTE_AUTH_USER_UUID_HERE');
5. Repeat only for each authorised tournament manager.
6. Admin URL is /pubg-admin.html.
Do not make the admin dashboard public as a menu item. The page itself is not the security boundary; RLS and the tournament_admins table are.

STEP 5 — VENUE AND OFFICIAL PAYMENT QR
The venue is already displayed as Seminar Hall, MCET on the homepage feature and tournament registration page.

ADD THE OFFICIAL PAYMENT QR
In pubg-registration.html, find:
  <div class="qr-placeholder"> ... </div>
Replace that whole placeholder div with:
  <div class="qr-placeholder"><img src="images/your-upi-qr.png" alt="Official Literary Society UPI QR code"></div>
Then add this CSS:
  .qr-placeholder img { width: 145px; height: 145px; object-fit: contain; }
Put your real QR image at images/your-upi-qr.png. Do not publish until the official QR has been inserted and tested.

STEP 6 — TEST BEFORE SHARING
- Open pubg-registration.html on localhost or your deployed Vercel site.
- Verify an email OTP; test an incorrect OTP too.
- Try submitting before verification (must be blocked).
- Upload a JPG/PNG under 5 MB and preview/remove/replace it.
- Try a file over 5 MB and a non-image file (must be rejected).
- Submit a test team with four distinct UIDs and accept the rulebook.
- Check Supabase table: payment_status and registration_status should both be pending.
- Check Storage: screenshot object should be in a user-id folder in the PRIVATE bucket.
- Sign in at pubg-admin.html with an authorised admin. Confirm it can see registrations and view proof via a short-lived signed URL.
- Sign in with an ordinary account: it must not see the admin dashboard data.
- Test mobile layout.
Delete test registrations and test payment files before opening registrations publicly.

STEP 7 — VERCEL DEPLOY
From your existing project folder in terminal:
  git status
  git add pubg-registration.html pubg-registration.css pubg-registration.js pubg-admin.html pubg-admin.css pubg-admin.js
  git commit -m "Add TLS esports tournament registration"
  git push origin main
Vercel should deploy from the connected GitHub repository automatically.

IMPORTANT NOTES / LIMITATIONS TO REVIEW
- This add-on deliberately does not invent a tournament date, deadline, prize pool, room ID, password, or UPI QR.
- No individual player names are collected.
- Payment screenshot upload does not verify payment. An admin must review it.
- Admin status changes are restricted by database RLS.
- The database stores the screenshot object path, not its image bytes.
- The existing TLS admin system remains separate.
- Consider adding a server-side duplicate-team/UID check and rate limiting before a high-volume public launch.
- Have a trusted adult/organiser review the payment collection, privacy notice, and tournament rules before accepting real payments from participants.
