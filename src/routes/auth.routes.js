const express = require("express");
const validate = require("../middleware/validate.middleware");
const { requireAuth } = require("../middleware/auth.middleware");
const { authLimiter } = require("../middleware/rateLimit.middleware");
const { registerSchema, loginSchema } = require("../validators/auth.validators");
const {
  register,
  verifyEmail,
  login,
  me,
  logout,
  resendVerification,
  devDeleteUser,
  updateProfile,
  changePassword,
  deleteAccount,
} = require("../controllers/auth.controller");

const router = express.Router();

router.post("/register", authLimiter, validate(registerSchema), register);
router.get("/verify-email/:token", verifyEmail);
router.post("/login", authLimiter, validate(loginSchema), login);
router.post("/resend-verification", authLimiter, resendVerification);
router.post("/dev-delete-user", devDeleteUser);
router.get("/me", requireAuth, me);
router.post("/logout", requireAuth, logout);
router.patch("/profile", requireAuth, updateProfile);
router.patch("/change-password", requireAuth, changePassword);
router.delete("/account", requireAuth, deleteAccount);

module.exports = router;
