const Redis = require("ioredis");
let redisClient;
const connectRedis = async () => {
   try {
      const redisUrl =
         process.env.NODE_ENV === "production"
            ? process.env.REDIS_CLOUD_URL
            : process.env.REDIS_LOCAL_URL;

      if (redisClient) return redisClient;

      redisClient = new Redis(redisUrl || "redis://localhost:6379");

      redisClient.on("error", (err) => {
         console.error("Redis error: ", err);
      });

      redisClient.on("connect", () => {
         console.log("Redis connected!✅");
      });

      return redisClient;
      
   } catch (error) {
      console.log("Error connecting to Redis!❌", error);
      process.exit(1);
   }
};

module.exports = connectRedis;
