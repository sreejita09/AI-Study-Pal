const nodemailer = require("nodemailer");
const env = require("../../config/env");

// ---------------------------------------------------------------------------
// Lazy transporter — created on first send, not at module load.
// This avoids a known Render issue where process.env vars are not yet
// injected when the module is first required at startup.
// ---------------------------------------------------------------------------
let _transporter = null;
let _transporterChecked = false;

function getTransporter() {
  if (_transporterChecked) return _transporter;
  _transporterChecked = true;

  // env.smtpUser / env.smtpPass are already normalised (whitespace + dots stripped)
  // by normalizeSecret() in config/env.js — use them instead of process.env directly
  // so Gmail App Passwords with spaces ("xxxx xxxx xxxx xxxx") are handled correctly.
  const user = env.smtpUser;   // e.g. "you@gmail.com"
  const pass = env.smtpPass;   // e.g. "abcdefghijklmnop" (16 chars after normalisation)

  console.log(`[email] SMTP_USER: ${user || "(not set)"}`);
  console.log(`[email] SMTP_PASS length: ${pass ? pass.length : 0} chars (expected 16 for Gmail App Password)`);

  if (user && pass) {
    const transport = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });

    // Verify connection asynchronously — never blocks startup
    transport.verify((err) => {
      if (err) {
        console.error("[email] SMTP verify failed:", err.message);
        console.error("[email] Common causes: wrong App Password, 2FA not enabled, 'Less secure apps' blocked.");
      } else {
        console.log("[email] SMTP connection verified — Gmail is ready to send.");
      }
    });

    _transporter = transport;
    return _transporter;
  }

  console.warn(
    "[email] Email service DISABLED — SMTP_USER or SMTP_PASS not set. " +
    "Emails will be silently skipped. Set both on Render to enable."
  );
  return null;
}

async function sendMail({ to, subject, html }) {
  const transport = getTransporter();

  if (!transport) {
    console.warn(`[email] Skipping send to ${to} — transporter not configured.`);
    return null;
  }

  const info = await transport.sendMail({
    from: env.mailFrom || env.smtpUser,
    to,
    subject,
    html,
  });

  console.log(`[email] Message sent — id: ${info.messageId}`);
  console.log(`[email] Accepted:  ${JSON.stringify(info.accepted)}`);
  console.log(`[email] Rejected:  ${JSON.stringify(info.rejected)}`);

  if (info.rejected && info.rejected.length > 0) {
    throw new Error(`Email rejected by SMTP server for: ${info.rejected.join(", ")}`);
  }

  return info;
}

async function sendVerificationEmail({ email, username, verificationUrl }) {
  // This throws on failure so the caller (register) can decide what to do.
  // The register controller catches it as non-fatal — but at least we log clearly.
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

module.exports = {
  sendVerificationEmail,
  sendMail,
  get transporter() { return getTransporter(); },
};
