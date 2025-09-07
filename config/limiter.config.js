const { RateLimiterRedis } = require("rate-limiter-flexible");
const connectRedis = require("../config/redis.config");

const createRateLimiter = async (points, duration, blockDuration = null) => {
   try {
      const redisClient = await connectRedis();
      
      return new RateLimiterRedis({
         storeClient: redisClient,
         keyPrefix: `rlflx_${points}_${duration}_`,
         points,
         duration,
         blockDuration: blockDuration ?? duration,
      });
   } catch (error) {
      console.log("Error creating limiter: ", error);
      throw error;
   }
};

module.exports = createRateLimiter;
