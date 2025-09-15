const { Router } = require("express");
const userRouter = Router();
const auth = require("../middlewares/auth");
const isAdmin = require("../middlewares/isAdmin");
const rateLimiterMiddleware = require("../middlewares/rateLimiter");
const path = require("path");
const {
   signUp,
   signIn,
   signOut,
   me,
   refreshToken,
} = require("../controllers/user.controller");

userRouter.post("/signup", signUp);
userRouter.post("/signin", rateLimiterMiddleware(5, 60, 120), signIn);
userRouter.post("/signOut", signOut);
userRouter.get("/refresh-token", refreshToken);
userRouter.get("/me", auth, me);
userRouter.get("/admin", auth, isAdmin, (req, res) => {
   res.sendFile(path.join(process.cwd(), "private", "adminPanel.html"));
});

module.exports = userRouter;
