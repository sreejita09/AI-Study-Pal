const express = require("express");
const router = express.Router();
const env = require("../config/env");
const { sendMail, transporter } = require("../services/email/email.service");

// GET /api/test-email?to=someone@example.com
// If no ?to param, sends to SMTP_USER (self-test)
router.get("/test-email", async (req, res) => {
  const recipient = req.query.to || env.smtpUser;

  if (!recipient) {
    return res.status(400).json({
      success: false,
      error: "No recipient. Set SMTP_USER env var or pass ?to=email@example.com"
    });
  }

  // Report current SMTP config without exposing the password
  const configStatus = {
    smtpUser: env.smtpUser || "(not set)",
    smtpPassLength: env.smtpPass ? env.smtpPass.length : 0,
    transporterReady: Boolean(transporter),
  };

  console.log("[test-email] Config:", configStatus);

  try {
    const info = await sendMail({
      to: recipient,
      subject: "AI Study Pal — SMTP Test",
      html: `
        <div style="font-family:Arial,sans-serif;padding:24px">
          <h2>SMTP Test</h2>
          <p>If you receive this email, your Gmail App Password is configured correctly on Render.</p>
          <p><strong>Sent at:</strong> ${new Date().toISOString()}</p>
        </div>
      `,
    });

    res.json({
      success: true,
      message: `Test email sent to ${recipient}`,
      config: configStatus,
      result: info ? { messageId: info.messageId, accepted: info.accepted, rejected: info.rejected } : "(skipped — no transporter)",
    });
  } catch (err) {
    console.error("[test-email] SMTP error:", err);
    res.status(500).json({
      success: false,
      error: err.message,
      config: configStatus,
    });
  }
});

module.exports = router;
