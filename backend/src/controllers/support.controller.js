const asyncHandler = require("../utils/asyncHandler");
const Support = require("../models/Support");
const { sendMail } = require("../services/email/email.service");

/**
 * POST /api/support/contact
 * Saves the request and emails the support team.
 */
const submitSupportRequest = asyncHandler(async (req, res) => {
  const { name, email, subject, message } = req.validatedBody;

  // Persist to DB
  await Support.create({ name, email, subject, message });

  // Send email to support team (non-fatal if email is disabled)
  const supportEmail =
    process.env.SUPPORT_EMAIL || process.env.SMTP_USER;

  if (supportEmail) {
    try {
      await sendMail({
        to: supportEmail,
        subject: `[Support] ${subject} — from ${name}`,
        html: `
          <div style="background:#111;padding:24px;font-family:Arial,sans-serif;color:#f5f5f5">
            <div style="max-width:560px;margin:0 auto;background:#1b1b1b;border:1px solid #2a2a2a;border-radius:16px;padding:24px">
              <p style="color:#facc15;letter-spacing:.16em;text-transform:uppercase;font-size:11px;margin:0 0 12px">
                AI Study Pal — Support Request
              </p>
              <h2 style="margin:0 0 20px;font-size:20px">${subject}</h2>

              <table style="width:100%;border-collapse:collapse;font-size:14px">
                <tr>
                  <td style="color:#888;padding:6px 0;width:80px">Name</td>
                  <td style="color:#f5f5f5;padding:6px 0">${name}</td>
                </tr>
                <tr>
                  <td style="color:#888;padding:6px 0">Email</td>
                  <td style="color:#f5f5f5;padding:6px 0">
                    <a href="mailto:${email}" style="color:#facc15">${email}</a>
                  </td>
                </tr>
                <tr>
                  <td style="color:#888;padding:6px 0">Subject</td>
                  <td style="color:#f5f5f5;padding:6px 0">${subject}</td>
                </tr>
              </table>

              <div style="margin-top:20px;padding:16px;background:#111;border:1px solid #2a2a2a;border-radius:10px">
                <p style="color:#888;font-size:12px;margin:0 0 8px">Message</p>
                <p style="color:#f5f5f5;font-size:14px;line-height:1.7;margin:0;white-space:pre-wrap">${message}</p>
              </div>

              <p style="color:#555;font-size:11px;margin-top:20px">
                Submitted ${new Date().toUTCString()}
              </p>
            </div>
          </div>
        `,
      });
    } catch (err) {
      // Email failed — still return success since the DB record was saved
      console.error("[support] Failed to send support email:", err.message);
    }
  }

  return res.status(200).json({
    message: "Support request received. We'll get back to you shortly.",
  });
});

module.exports = { submitSupportRequest };
