const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const env = require("../config/env");

function signAuthToken(userId) {
  return jwt.sign({ sub: userId }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn
  });
}

function verifyAuthToken(token) {
  return jwt.verify(token, env.jwtSecret);
}

function createEmailVerificationToken() {
  const plainToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto
    .createHash("sha256")
    .update(plainToken)
    .digest("hex");

  return {
    plainToken,
    hashedToken,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24)
  };
}

module.exports = {
  signAuthToken,
  verifyAuthToken,
  createEmailVerificationToken
};
