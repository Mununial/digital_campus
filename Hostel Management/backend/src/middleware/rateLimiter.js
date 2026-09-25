const loginAttempts = new Map();

// Cleaner in-memory store cleanup interval (every 10 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of loginAttempts.entries()) {
    if (now > data.resetTime) {
      loginAttempts.delete(ip);
    }
  }
}, 10 * 60 * 1000);

/**
 * Basic in-memory rate limiter to protect endpoints against brute force attacks.
 * Limit: 5 attempts per 15 minutes.
 */
const loginRateLimiter = (req, res, next) => {
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const now = Date.now();
  const limitWindowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 50;

  let attemptData = loginAttempts.get(ip);

  if (!attemptData) {
    attemptData = {
      count: 1,
      resetTime: now + limitWindowMs
    };
    loginAttempts.set(ip, attemptData);
    return next();
  }

  // If time window passed, reset
  if (now > attemptData.resetTime) {
    attemptData.count = 1;
    attemptData.resetTime = now + limitWindowMs;
    return next();
  }

  attemptData.count += 1;

  if (attemptData.count > maxAttempts) {
    const minutesLeft = Math.ceil((attemptData.resetTime - now) / (60 * 1000));
    return res.status(429).json({
      success: false,
      message: `Too many login attempts from this IP. Please try again after ${minutesLeft} minute(s).`
    });
  }

  next();
};

module.exports = {
  loginRateLimiter
};
