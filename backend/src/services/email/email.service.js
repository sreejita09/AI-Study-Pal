const nodemailer = require("nodemailer");

// ---------------------------------------------------------------------------
// Stateless email sender — creates a fresh transporter per call.
//
// WHY stateless:
//   A singleton/lazy pattern permanently caches `null` if env vars are missing
//   on the first call. Stateless = no cache = no stale state, ever.
//
// WHY host/port instead of service:"gmail":
//   The `service:"gmail"` shorthand can silently pick the wrong port or get
//   blocked by Render's network. Explicit host + STARTTLS is more reliable.
// ---------------------------------------------------------------------------

async function sendMail({ to, subject, html }) {
  // ── 1. Read and log raw env values ──────────────────────────────────────
  const rawUser = process.env.SMTP_USER || "";
  const rawPass = process.env.SMTP_PASS || "";

  const smtpUser = rawUser.trim();
  // Strip internal spaces from App Passwords ("abcd efgh ijkl mnop" → "abcdefghijklmnop")
  const smtpPass = rawPass.trim().replace(/\s+/g, "");

  console.log("[email] SMTP_USER raw length:", rawUser.length, "| value:", smtpUser || "(empty)");
  console.log("[email] SMTP_PASS raw length:", rawPass.length, "| normalized length:", smtpPass.length, "(expected 16 for Gmail App Password)");

  // ── 2. Fail immediately if credentials are missing ───────────────────────
  if (!smtpUser || !smtpPass) {
    throw new Error(
      `SMTP credentials missing — SMTP_USER set: ${Boolean(smtpUser)}, SMTP_PASS set: ${Boolean(smtpPass)}`
    );
  }

  // ── 3. Create transporter with explicit host/port (more reliable than service:"gmail") ──
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // STARTTLS — required for port 587
    auth: { user: smtpUser, pass: smtpPass },
  });

  // ── 4. Verify credentials synchronously before attempting send ───────────
  console.log("[email] Verifying SMTP connection with Gmail...");
  await transporter.verify(); // throws if credentials are wrong or network blocked
  console.log("[email] SMTP READY — Gmail accepted credentials");

  // ── 5. Send ──────────────────────────────────────────────────────────────
  console.log(`[email] Sending to: ${to} | subject: ${subject}`);
  const info = await transporter.sendMail({
    from: `AI Study Pal <${smtpUser}>`,
    to,
    subject,
    html,
  });

  // ── 6. Log complete SMTP result ───────────────────────────────────────────
  console.log("EMAIL RESULT:", JSON.stringify({
    messageId: info.messageId,
    accepted:  info.accepted,
    rejected:  info.rejected,
    response:  info.response,
    envelope:  info.envelope,
  }, null, 2));

  // ── 7. Throw if not actually accepted ────────────────────────────────────
  if (!info.accepted || info.accepted.length === 0) {
    throw new Error(
      `Email not accepted by Gmail. rejected=${JSON.stringify(info.rejected)} response=${info.response}`
    );
  }
  if (info.rejected && info.rejected.length > 0) {
    throw new Error(`Email partially rejected for: ${info.rejected.join(", ")}`);
  }

  return info;
}

async function sendVerificationEmail({ email, username, verificationUrl }) {
  await sendMail({
    to: email,
    subject: "Verify your AI Study Pal account",
    html: `
      <div style="background:#111111;padding:32px;font-family:Arial,sans-serif;color:#f5f5f5">
        <div style="max-width:560px;margin:0 auto;background:#1b1b1b;border:1px solid #2a2a2a;border-radius:24px;padding:32px">
          <p style="color:#facc15;letter-spacing:.18em;text-transform:uppercase;font-size:12px">AI Study Pal</p>
          <h1 style="margin:0 0 16px;font-size:28px">Welcome, ${username}!</h1>
          <p style="color:#b3b3b3;line-height:1.7">Click the button below to verify your email and unlock your learning dashboard.</p>
          <a href="${verificationUrl}" style="display:inline-block;margin-top:20px;background:#facc15;color:#111;padding:14px 28px;border-radius:14px;text-decoration:none;font-weight:700;font-size:15px">Verify Email</a>
          <p style="margin-top:24px;color:#666;font-size:12px">This link expires in 24 hours. If you did not create an account, ignore this email.</p>
        </div>
      </div>
    `,
  });
}

module.exports = { sendVerificationEmail, sendMail };

