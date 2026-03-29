const express = require("express");
const router = express.Router();
const { sendMail, transporter } = require("../services/email/email.service");

router.get("/test-email", async (req, res) => {
  const to = req.query.to || process.env.SMTP_USER;
  const smtpUser = (process.env.SMTP_USER || "").trim();
  const smtpPass = (process.env.SMTP_PASS || "").replace(/\s+/g, "");

  const diag = {
    SMTP_USER_set: !!smtpUser,
    SMTP_USER_value: smtpUser || "(empty)",
    SMTP_PASS_set: !!smtpPass,
    SMTP_PASS_length: smtpPass.length,
    SMTP_PASS_looks_valid: smtpPass.length === 16 && /^[a-z]+$/.test(smtpPass),
    is_gmail: smtpUser.endsWith("@gmail.com"),
    transporter_exists: !!transporter,
    CLIENT_URL: process.env.CLIENT_URL || "(not set)",
    NODE_ENV: process.env.NODE_ENV || "(not set)",
    to
  };

  if (!transporter) {
    return res.status(500).json({ error: "No email transporter configured", diag });
  }

  if (!smtpUser.endsWith("@gmail.com")) {
    return res.status(500).json({
      error: "SMTP_USER must be a @gmail.com address to use Gmail SMTP. Current value is not Gmail.",
      fix: "Go to Render → Environment → set SMTP_USER to your Gmail address (the one that generated the App Password)",
      diag
    });
  }

  try {
    const info = await sendMail({
      to,
      subject: "Test Email from AI Study Pal",
      html: "<b>This is a test email from AI Study Pal backend.</b>"
    });
    res.json({ message: `Test email sent to ${to}`, messageId: info?.messageId, diag });
  } catch (err) {
    res.status(500).json({ error: "Send failed", details: err.message, diag });
  }
});

module.exports = router;
