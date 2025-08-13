// Load environment variables from .env file
require("dotenv").config();

// Express app setup
const express = require("express");
const app = express();
const port = process.env.PORT || 3000;

// MongoDB connection
const connectDb = require("./config/db.config");
connectDb();

// Other Package imports
const cookieParser = require("cookie-parser");
const cors = require("cors");

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

app.listen(port, () => console.log(`App listening on port ${port}!`));
