
require('dotenv').config();
const nodemailer = require("nodemailer");
const env = require("../../config/env");

function createTransporter() {
  // Strip spaces from app password (Gmail shows them as "xxxx xxxx xxxx xxxx")
  const smtpUser = (process.env.SMTP_USER || "").trim();
  const smtpPass = (process.env.SMTP_PASS || "").replace(/\s+/g, "").trim();

  if (!smtpUser || !smtpPass) {
    console.warn("[email] SMTP disabled: SMTP_USER or SMTP_PASS not set");
    return null;
  }

  console.log(`[email] Configuring SMTP for ${smtpUser} (pass length: ${smtpPass.length})`);

  // Gmail path
  if (smtpUser.endsWith("@gmail.com")) {
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

  // Mailtrap / generic SMTP path
  const host = process.env.MAILTRAP_HOST || process.env.SMTP_HOST;
  const port = process.env.MAILTRAP_PORT || process.env.SMTP_PORT || 587;
  if (host) {
    return nodemailer.createTransport({
      host,
      port: parseInt(port, 10),
      auth: {
        user: process.env.MAILTRAP_USER || smtpUser,
        pass: process.env.MAILTRAP_PASS || smtpPass
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000
    });
  }

  console.warn("[email] SMTP disabled: no host configured");
  return null;
}

// Create once at startup
let transporter = createTransporter();

async function sendMail({ to, subject, html }) {
  if (!transporter) {
    console.error("[email] Cannot send — no transporter configured. Check SMTP_USER / SMTP_PASS env vars.");
    return;
  }

  console.log(`[email] Sending "${subject}" to ${to} ...`);
  try {
    const info = await transporter.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to,
      subject,
      html
    });
    console.log(`[email] Sent OK: messageId=${info.messageId}`);
    return info;
  } catch (err) {
    console.error(`[email] Send FAILED to ${to}:`, err.message);
    // If auth failed, log hint
    if (err.responseCode === 535 || err.message.includes("Invalid login")) {
      console.error("[email] HINT: Check that SMTP_PASS is a valid Gmail App Password (16 chars, no spaces).");
    }
    throw err;
  }
}

async function sendVerificationEmail({ email, username, verificationUrl }) {
  try {
    await sendMail({
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
  } catch (err) {
    console.error("FULL EMAIL ERROR:", err);
    throw err;
  }
}

module.exports = {
  sendVerificationEmail,
  sendMail,
  transporter
};
