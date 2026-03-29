const rateLimit = require("express-rate-limit");
const env = require("../config/env");

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.isProduction ? 10 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: !env.isProduction,
  message: { message: "Too many auth attempts. Please try again shortly." }
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false
});

// 5 support submissions per IP per hour
const supportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many support requests. Please wait before submitting again." }
});

module.exports = {
  authLimiter,
  apiLimiter,
  supportLimiter,
};
