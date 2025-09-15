// Load environment variables from .env file
require("dotenv").config();

// Express app setup
const express = require("express");
const app = express();
const port = process.env.PORT || 3000;

// MongoDB and Redis connection
const connectDb = require("./config/db.config");
const connectRedis = require("./config/redis.config");
(async () => {
   try {
      await connectDb();
      const redis = await connectRedis();
      redis.once("connect", () => {
         console.log("Databases connected!✅");
      });
   } catch (err) {
      console.error("Startup error:", err);
      process.exit(1);
   }
})();

// Other Package imports
const cookieParser = require("cookie-parser");
const cors = require("cors");

// app.set("trust proxy", 1); // Uncomment this if behind a reverse proxy like vercel or ngnix

// Middlewares
app.use(cookieParser());
app.use(express.json());
app.use(
   cors({
      origin: process.env.CORS_ORIGIN.split(","),
      credentials: true,
   })
);
app.use(express.static("public"));

// Routers
const userRouter = require("./routes/user.routes");
const courseRouter = require("./routes/course.routes");
const uploadRouter = require("./routes/upload.routes");

app.use("/api/v1/user", userRouter);
app.use("/api/v1/course", courseRouter);
app.use("/api/v1/upload", uploadRouter);

app.get("/", (req, res) => {
   res.sendFile(__dirname + "/public/auth.html");
});

app.listen(port, () => console.log(`App listening on port ${port}!`));
