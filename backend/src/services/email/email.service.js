
require('dotenv').config();
const nodemailer = require("nodemailer");

function createTransporter() {
  const smtpUser = (process.env.SMTP_USER || "").trim();
  const smtpPass = (process.env.SMTP_PASS || "").replace(/\s+/g, "").trim();

  console.log("[email] SMTP_USER set:", !!smtpUser, smtpUser ? `(${smtpUser.length} chars, ends: ...${smtpUser.slice(-10)})` : "");
  console.log("[email] SMTP_PASS set:", !!smtpPass, smtpPass ? `(${smtpPass.length} chars)` : "");

  if (!smtpUser || !smtpPass) {
    console.warn("[email] SMTP disabled: SMTP_USER or SMTP_PASS not set");
    return null;
  }

  // Use Gmail SMTP for any SMTP_USER (App Passwords authenticate the Google account)
  console.log("[email] Creating Gmail SMTP transporter for", smtpUser);
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: { user: smtpUser, pass: smtpPass },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000
  });
}

let transporter = createTransporter();

async function sendMail({ to, subject, html }) {
  if (!transporter) {
    console.error("[email] Cannot send — no transporter. SMTP_USER or SMTP_PASS missing.");
    return null;
  }

  // Verify SMTP connection first
  console.log("[email] Verifying SMTP connection...");
  try {
    await transporter.verify();
    console.log("[email] SMTP CONNECTION OK");
  } catch (verifyErr) {
    console.error("[email] SMTP verify FAILED:", verifyErr.message);
    if (verifyErr.responseCode === 535 || verifyErr.message.includes("Invalid login")) {
      console.error("[email] HINT: SMTP_USER must be the Gmail address that owns the App Password.");
      console.error("[email] HINT: SMTP_PASS must be a 16-letter Gmail App Password. Generate at https://myaccount.google.com/apppasswords");
    }
    throw verifyErr;
  }

  const from = process.env.MAIL_FROM || process.env.SMTP_USER;
  console.log(`[email] Sending "${subject}" from=${from} to=${to}`);

  try {
    const info = await transporter.sendMail({ from, to, subject, html });
    console.log("[email] SENT OK");
    console.log("[email]   messageId:", info.messageId);
    console.log("[email]   accepted:", info.accepted);
    console.log("[email]   rejected:", info.rejected);
    console.log("[email]   response:", info.response);
    return info;
  } catch (err) {
    console.error("[email] sendMail FAILED:", err.message);
    console.error("[email] Full error:", JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
    throw err;
  }
}

async function sendVerificationEmail({ email, username, verificationUrl }) {
  console.log(`[email] sendVerificationEmail called for ${email}, url=${verificationUrl}`);
  const info = await sendMail({
    to: email,
    subject: "Verify your AI Study Pal account",
    html: `
      <div style="background:#111111;padding:32px;font-family:Arial,sans-serif;color:#f5f5f5">
        <div style="max-width:560px;margin:0 auto;background:#1b1b1b;border:1px solid #2a2a2a;border-radius:24px;padding:32px">
          <p style="color:#facc15;letter-spacing:.18em;text-transform:uppercase;font-size:12px">AI Study Pal</p>
          <h1 style="margin:0 0 16px;font-size:28px">Welcome, ${username}</h1>
          <p style="color:#b3b3b3;line-height:1.7">Verify your email to unlock your learning dashboard, adaptive quiz engine, and file workspace.</p>
          <a href="${verificationUrl}" style="display:inline-block;margin-top:20px;background:#facc15;color:#111;padding:14px 20px;border-radius:14px;text-decoration:none;font-weight:700">Verify Email</a>
        </div>
      </div>
    `
  });
  return info;
}

module.exports = {
  sendVerificationEmail,
  sendMail,
  get transporter() { return transporter; }
};
