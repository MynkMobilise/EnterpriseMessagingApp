const rateLimit = require('express-rate-limit');
const { RateLimitError } = require('../utils/errorTypes');

// In-memory rate limiting storage
const rateLimitStore = new Map();

// Cleanup expired entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Cleanup every minute

/**
 * Create in-memory rate limiter
 */
const createMemoryRateLimiter = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100, // limit each IP to 100 requests per windowMs
    keyGenerator = (req) => req.ip,
  } = options;

  return async (req, res, next) => {
    try {
      const key = `rate_limit:${keyGenerator(req)}:${Math.floor(Date.now() / windowMs)}`;
      const now = Date.now();
      
      // Get or create counter
      let counter = rateLimitStore.get(key);
      if (!counter || counter.resetTime < now) {
        counter = {
          count: 0,
          resetTime: now + windowMs,
        };
        rateLimitStore.set(key, counter);
      }

      // Increment counter
      counter.count++;

      // Check if limit exceeded
      if (counter.count > max) {
        const resetTime = Math.ceil((counter.resetTime - now) / 1000);
        res.setHeader('X-RateLimit-Limit', max);
        res.setHeader('X-RateLimit-Remaining', 0);
        res.setHeader('X-RateLimit-Reset', new Date(counter.resetTime).toISOString());
        
        return next(new RateLimitError(`Too many requests, please try again after ${resetTime} seconds`));
      }

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, max - counter.count));
      res.setHeader('X-RateLimit-Reset', new Date(counter.resetTime).toISOString());

      next();
    } catch (error) {
      console.error('Rate limiter error:', error);
      next(); // Fail open
    }
  };
};

/**
 * API Key rate limiter (in-memory)
 */
const apiKeyRateLimiter = async (req, res, next) => {
  try {
    const apiKeyId = req.apiKey?.id;
    if (!apiKeyId) {
      return next();
    }

    const now = Date.now();
    const minuteWindow = Math.floor(now / 60000);
    const dayWindow = Math.floor(now / 86400000);

    const perMinuteKey = `rate_limit:api_key:${apiKeyId}:minute:${minuteWindow}`;
    const perDayKey = `rate_limit:api_key:${apiKeyId}:day:${dayWindow}`;

    // Get or create minute counter
    let minuteCounter = rateLimitStore.get(perMinuteKey);
    if (!minuteCounter || minuteCounter.resetTime < now) {
      minuteCounter = {
        count: 0,
        resetTime: (minuteWindow + 1) * 60000, // Next minute
      };
      rateLimitStore.set(perMinuteKey, minuteCounter);
    }
    minuteCounter.count++;

    // Get or create day counter
    let dayCounter = rateLimitStore.get(perDayKey);
    if (!dayCounter || dayCounter.resetTime < now) {
      dayCounter = {
        count: 0,
        resetTime: (dayWindow + 1) * 86400000, // Next day
      };
      rateLimitStore.set(perDayKey, dayCounter);
    }
    dayCounter.count++;

    const limitPerMinute = req.apiKey.rateLimitPerMinute || 100;
    const limitPerDay = req.apiKey.rateLimitPerDay || 50000;

    if (minuteCounter.count > limitPerMinute) {
      return next(new RateLimitError('API key rate limit exceeded (per minute)'));
    }

    if (dayCounter.count > limitPerDay) {
      return next(new RateLimitError('API key rate limit exceeded (per day)'));
    }

    next();
  } catch (error) {
    console.error('API key rate limiter error:', error);
    next(); // Fail open
  }
};

/**
 * Standard rate limiter (using express-rate-limit with memory store)
 * DISABLED - Always skip rate limiting
 */
const standardRateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // DISABLED: Always skip rate limiting
    return true;
  },
});

/**
 * Strict rate limiter for auth endpoints
 * DISABLED - Always skip rate limiting
 */
const authRateLimiter = rateLimit({
  windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 10, // limit each IP to 10 requests per windowMs (increased from 5 for development)
  message: 'Too many authentication attempts, please try again later.',
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // DISABLED: Always skip rate limiting
    return true;
  },
});

/**
 * Reset rate limits (development only)
 * This function clears all rate limit entries from memory
 */
const resetRateLimits = () => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Rate limit reset is not allowed in production');
  }
  rateLimitStore.clear();
  return { message: 'Rate limits reset successfully', cleared: true };
};

module.exports = {
  createMemoryRateLimiter,
  createRedisRateLimiter: createMemoryRateLimiter, // Alias for backward compatibility
  apiKeyRateLimiter,
  standardRateLimiter,
  authRateLimiter,
  resetRateLimits,
};
