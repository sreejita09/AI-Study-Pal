const express = require("express");
const router = express.Router();
const { sendMail, transporter } = require("../services/email/email.service");

router.get("/test-email", async (req, res) => {
  const to = req.query.to || process.env.SMTP_USER;
  const smtpUser = (process.env.SMTP_USER || "").trim();
  const smtpPass = (process.env.SMTP_PASS || "").replace(/\s+/g, "");

  // Diagnostic info
  const diag = {
    SMTP_USER_set: !!smtpUser,
    SMTP_USER_value: smtpUser ? smtpUser.replace(/(.{3}).*(@.*)/, "$1***$2") : "(empty)",
    SMTP_PASS_set: !!smtpPass,
    SMTP_PASS_length: smtpPass.length,
    transporter_exists: !!transporter,
    CLIENT_URL: process.env.CLIENT_URL || "(not set)",
    to
  };

  if (!transporter) {
    return res.status(500).json({ error: "No email transporter configured", diag });
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
