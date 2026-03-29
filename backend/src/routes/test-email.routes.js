const express = require("express");
const nodemailer = require("nodemailer");
const router = express.Router();

// GET /api/test-email?to=someone@example.com
//
// Fully isolated SMTP test — does NOT go through email.service.js.
// This lets you verify SMTP config independently of the auth flow.
//
// Response JSON contains a `report` object with every step logged.
// Read steps[] top-to-bottom to find exactly where it failed.
router.get("/test-email", async (req, res) => {
  const steps = [];

  // ── 1. Read raw env vars and report them ────────────────────────────────
  const rawUser = process.env.SMTP_USER || "";
  const rawPass = process.env.SMTP_PASS || "";
  const smtpUser = rawUser.trim();
  const smtpPass = rawPass.trim().replace(/\s+/g, ""); // strip spaces from App Password

  const envReport = {
    NODE_ENV: process.env.NODE_ENV || "(not set)",
    SMTP_USER_raw_length: rawUser.length,
    SMTP_USER_value: smtpUser || "(empty)",
    SMTP_PASS_raw_length: rawPass.length,
    SMTP_PASS_normalized_length: smtpPass.length,
    SMTP_PASS_looks_valid: smtpPass.length === 16,
  };

  steps.push({ step: "env", data: envReport });
  console.log("[test-email] ENV:", JSON.stringify(envReport));

  const recipient = (req.query.to || smtpUser).trim();
  if (!recipient) {
    return res.status(400).json({
      success: false,
      error: "No recipient. Pass ?to=email@example.com or set SMTP_USER on Render.",
      steps,
    });
  }

  steps.push({ step: "recipient", value: recipient });

  // ── 2. Validate credentials before even trying ───────────────────────────
  if (!smtpUser || !smtpPass) {
    const msg = `Credentials missing — SMTP_USER: ${Boolean(smtpUser)}, SMTP_PASS: ${Boolean(smtpPass)}`;
    steps.push({ step: "credentials_check", result: "FAILED", reason: msg });
    console.error("[test-email]", msg);
    return res.status(500).json({ success: false, error: msg, steps });
  }
  steps.push({ step: "credentials_check", result: "OK" });

  // ── 3. Create transporter ────────────────────────────────────────────────
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // STARTTLS
    auth: { user: smtpUser, pass: smtpPass },
  });
  steps.push({ step: "transporter_created", host: "smtp.gmail.com", port: 587 });

  // ── 4. Verify SMTP connection ────────────────────────────────────────────
  try {
    await transporter.verify();
    steps.push({ step: "smtp_verify", result: "SMTP READY" });
    console.log("[test-email] SMTP READY");
  } catch (verifyErr) {
    steps.push({ step: "smtp_verify", result: "FAILED", error: verifyErr.message });
    console.error("[test-email] SMTP verify failed:", verifyErr.message);
    return res.status(500).json({
      success: false,
      error: `SMTP verify failed: ${verifyErr.message}`,
      hint: "Check SMTP_PASS is a Gmail App Password (not your account password). 2FA must be enabled on the sending Gmail account.",
      steps,
    });
  }

  // ── 5. Send test email ───────────────────────────────────────────────────
  try {
    steps.push({ step: "send_attempt", to: recipient });
    const info = await transporter.sendMail({
      from: `AI Study Pal Test <${smtpUser}>`,
      to: recipient,
      subject: "AI Study Pal — SMTP Test",
      html: `
        <div style="font-family:Arial,sans-serif;padding:24px;background:#f9f9f9">
          <h2 style="color:#111">SMTP Test Successful</h2>
          <p>If you see this, your Gmail App Password is correctly configured on Render.</p>
          <p><strong>Sent at:</strong> ${new Date().toISOString()}</p>
          <p><strong>From:</strong> ${smtpUser}</p>
          <p><strong>To:</strong> ${recipient}</p>
        </div>
      `,
    });

    const result = {
      messageId: info.messageId,
      accepted:  info.accepted,
      rejected:  info.rejected,
      response:  info.response,
    };
    steps.push({ step: "send_result", ...result });
    console.log("[test-email] EMAIL RESULT:", JSON.stringify(result, null, 2));

    if (!info.accepted || info.accepted.length === 0) {
      return res.status(500).json({
        success: false,
        error: `Gmail accepted the connection but did not accept the recipient: ${JSON.stringify(info.rejected)}`,
        hint: "The recipient address may be blocked or invalid.",
        steps,
      });
    }

    return res.json({
      success: true,
      message: `Test email accepted by Gmail for delivery to ${recipient}. Check inbox + spam.`,
      steps,
    });
  } catch (sendErr) {
    steps.push({ step: "send_result", result: "FAILED", error: sendErr.message });
    console.error("[test-email] sendMail failed:", sendErr.message);
    return res.status(500).json({
      success: false,
      error: `sendMail failed: ${sendErr.message}`,
      steps,
    });
  }
});

module.exports = router;

