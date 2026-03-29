
require('dotenv').config();
const nodemailer = require("nodemailer");
const env = require("../../config/env");

function getTransporter() {
  // Try Gmail first
  if (
    process.env.SMTP_USER &&
    process.env.SMTP_USER.endsWith("@gmail.com") &&
    process.env.SMTP_PASS &&
    process.env.SMTP_PASS.length === 16 &&
    !process.env.SMTP_PASS.includes(" ")
  ) {
    const gmailTransporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    gmailTransporter.verify((error, success) => {
      if (error) {
        console.error("SMTP CONFIG ERROR (Gmail):", error);
      } else {
        console.log("SMTP server (Gmail) is ready");
      }
    });

    return gmailTransporter;
  }

  // Fallback to Mailtrap
  if (
    process.env.MAILTRAP_HOST &&
    process.env.MAILTRAP_PORT &&
    process.env.MAILTRAP_USER &&
    process.env.MAILTRAP_PASS
  ) {
    const mailtrapTransporter = nodemailer.createTransport({
      host: process.env.MAILTRAP_HOST,
      port: parseInt(process.env.MAILTRAP_PORT, 10),
      auth: {
        user: process.env.MAILTRAP_USER,
        pass: process.env.MAILTRAP_PASS,
      },
    });

    mailtrapTransporter.verify((error, success) => {
      if (error) {
        console.error("SMTP CONFIG ERROR (Mailtrap):", error);
      } else {
        console.log("SMTP server (Mailtrap) is ready");
      }
    });

    return mailtrapTransporter;
  }

  throw new Error("No valid SMTP configuration found.");
}

const transporter = getTransporter();

async function sendMail({ to, subject, html }) {
  try {
    await transporter.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error("FULL EMAIL ERROR:", err);
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
