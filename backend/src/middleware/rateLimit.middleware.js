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

module.exports = {
  authLimiter,
  apiLimiter
};
