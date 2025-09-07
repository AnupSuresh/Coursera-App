const createRateLimiter = require("../config/limiter.config");

const rateLimiterMiddleware = (points, duration, blockDuration = null) => {
   let limiter;
   return async (req, res, next) => {
      try {
         if (!limiter) {
            limiter = await createRateLimiter(points, duration, blockDuration);
         }
         const result = await limiter.consume(req.ip);
         next();
      } catch (rejres) {
         console.log(`Rate limit exceeded for IP: ${req.ip}`, rejres);
         res.set("Retry-After", String(Math.ceil(rejres.msBeforeNext / 1000)));
         res.status(429).json({
            error: "Too many requests. Please try again later.",
         });
      }
   };
};

module.exports = rateLimiterMiddleware;
