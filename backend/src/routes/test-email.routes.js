const express = require("express");
const router = express.Router();
const { sendMail, transporter } = require("../services/email/email.service");

router.get("/test-email", async (req, res) => {
  try {
    await sendMail({
      to: process.env.SMTP_USER,
      subject: "Test Email",
      html: "<b>This is a test email from AI Study Pal backend.</b>"
    });
    res.json({ message: "Test email sent to " + process.env.SMTP_USER });
  } catch (err) {
    console.error("FULL EMAIL ERROR:", err);
    res.status(500).json({ error: "Failed to send test email", details: err.message });
  }
});

module.exports = router;
