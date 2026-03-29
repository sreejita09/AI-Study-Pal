const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const User = require("../models/User");
const LearningProfile = require("../models/LearningProfile");
const env = require("../config/env");
const asyncHandler = require("../utils/asyncHandler");
const { signAuthToken, createEmailVerificationToken } = require("../utils/token");
const { sendVerificationEmail } = require("../services/email/email.service");
const { syncLearningProfile } = require("../services/learningEngine");

function setAuthCookie(res, token) {
  res.cookie(env.cookieName, token, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "lax",
    maxAge: 1000 * 60 * 60 * 24 * 7
  });
}

const register = asyncHandler(async (req, res) => {
  const { username, email, password } = req.validatedBody;

  const normalizedEmail = email.toLowerCase();

  const existingUser = await User.findOne({
    $or: [{ username }, { email: normalizedEmail }]
  });

  if (existingUser) {
    if (existingUser.isEmailVerified) {
      return res.status(409).json({
        message: "Username or email already exists"
      });
    }

    await LearningProfile.deleteOne({ user: existingUser._id });
    await User.deleteOne({ _id: existingUser._id });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const tokenBundle = createEmailVerificationToken();

  const user = await User.create({
    username,
    email: normalizedEmail,
    passwordHash,
    emailVerificationToken: tokenBundle.hashedToken,
    emailVerificationExpiresAt: tokenBundle.expiresAt
  });

  try {
    await LearningProfile.create({ user: user._id });
    await syncLearningProfile(user);

    const verificationUrl = `${env.clientUrl}/verify-email/${tokenBundle.plainToken}`;
    await sendVerificationEmail({
      email: normalizedEmail,
      username,
      verificationUrl
    });
  } catch (error) {
    await LearningProfile.deleteOne({ user: user._id });
    await User.deleteOne({ _id: user._id });
    throw error;
  }

  res.status(201).json({
    message: "Account created. Please verify your email before logging in."
  });
});

const verifyEmail = asyncHandler(async (req, res) => {
  const tokenHash = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    emailVerificationToken: tokenHash,
    emailVerificationExpiresAt: { $gt: new Date() }
  });

  if (!user) {
    return res.status(400).json({ message: "Verification link is invalid or expired" });
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpiresAt = undefined;
  await user.save();

  res.json({ message: "Email verified successfully. You can now log in." });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.validatedBody;

  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  if (!user.isEmailVerified) {
    return res.status(403).json({ message: "Verify your email before logging in" });
  }

  const token = signAuthToken(user._id.toString());
  setAuthCookie(res, token);

  res.json({
    message: "Login successful",
    token,
    user: {
      id: user._id,
      username: user.username,
      email: user.email
    }
  });
});

const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});

const logout = asyncHandler(async (req, res) => {
  res.clearCookie(env.cookieName);
  res.json({ message: "Logged out successfully" });
});

const resendVerification = asyncHandler(async (req, res) => {
  const email = String(req.body?.email || "")
    .trim()
    .toLowerCase();

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  const user = await User.findOne({ email });

  if (!user) {
    return res.status(404).json({ message: "No account found for that email" });
  }

  if (user.isEmailVerified) {
    return res.json({ message: "This email is already verified." });
  }

  const tokenBundle = createEmailVerificationToken();
  user.emailVerificationToken = tokenBundle.hashedToken;
  user.emailVerificationExpiresAt = tokenBundle.expiresAt;
  await user.save();

  const verificationUrl = `${env.clientUrl}/verify-email/${tokenBundle.plainToken}`;
  await sendVerificationEmail({
    email: user.email,
    username: user.username,
    verificationUrl
  });

  res.json({ message: "Verification email sent successfully." });
});

const devDeleteUser = asyncHandler(async (req, res) => {
  if (env.isProduction) {
    return res.status(403).json({ message: "Unavailable in production" });
  }

  const email = String(req.body?.email || "")
    .trim()
    .toLowerCase();
  const username = String(req.body?.username || "").trim();

  if (!email && !username) {
    return res.status(400).json({ message: "Email or username is required" });
  }

  const filter = email ? { email } : { username };
  const user = await User.findOne(filter);

  if (!user) {
    return res.json({ message: "No saved account matched that email or username." });
  }

  await LearningProfile.deleteOne({ user: user._id });
  await User.deleteOne({ _id: user._id });

  res.json({
    message: "Saved account removed successfully.",
    deletedUser: {
      email: user.email,
      username: user.username
    }
  });
});

/**
 * PATCH /api/auth/profile
 * Update user preferences (email notifications, peak energy, study prefs, daily goal).
 */
const updateProfile = asyncHandler(async (req, res) => {
  const allowed = [
    "preferences.emailNotifications",
    "preferences.peakEnergyTime",
    "gamification.dailyGoal",
    "studyPrefs",
  ];

  const update = {};

  // Study preferences stored inside preferences sub-doc
  const { emailNotifications, peakEnergyTime, dailyGoal, inAppNotifications,
          pomodoroMinutes, breakMinutes } = req.body;

  if (typeof emailNotifications === "boolean") {
    update["preferences.emailNotifications"] = emailNotifications;
  }
  if (peakEnergyTime && ["morning", "afternoon", "night"].includes(peakEnergyTime)) {
    update["preferences.peakEnergyTime"] = peakEnergyTime;
  }
  if (typeof inAppNotifications === "boolean") {
    update["preferences.inAppNotifications"] = inAppNotifications;
  }
  if (typeof pomodoroMinutes === "number" && pomodoroMinutes >= 5 && pomodoroMinutes <= 90) {
    update["preferences.pomodoroMinutes"] = pomodoroMinutes;
  }
  if (typeof breakMinutes === "number" && breakMinutes >= 1 && breakMinutes <= 60) {
    update["preferences.breakMinutes"] = breakMinutes;
  }
  if (typeof dailyGoal === "number" && dailyGoal >= 1 && dailyGoal <= 20) {
    update["gamification.dailyGoal"] = dailyGoal;
  }

  if (Object.keys(update).length === 0) {
    return res.status(400).json({ error: "No valid fields to update" });
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: update },
    { new: true }
  ).select("-passwordHash -emailVerificationToken");

  res.json({ user });
});

/**
 * PATCH /api/auth/change-password
 * Change password after verifying current one.
 */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Current and new password are required" });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: "New password must be at least 8 characters" });
  }

  const user = await User.findById(req.user._id).select("+passwordHash");
  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: "Current password is incorrect" });
  }

  user.passwordHash = await bcrypt.hash(newPassword, 12);
  await user.save();

  res.json({ message: "Password updated successfully" });
});

/**
 * DELETE /api/auth/account
 * Permanently delete the authenticated user's account.
 */
const deleteAccount = asyncHandler(async (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ error: "Password is required to delete account" });
  }

  const user = await User.findById(req.user._id).select("+passwordHash");
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: "Incorrect password" });
  }

  await LearningProfile.deleteOne({ user: user._id });
  await User.deleteOne({ _id: user._id });

  res.clearCookie(env.cookieName);
  res.json({ message: "Account deleted successfully" });
});

module.exports = {
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
};
