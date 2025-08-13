const { Router } = require("express");
const userRouter = Router();
const auth = require("../middlewares/auth");
const isAdmin = require("../middlewares/isAdmin");
const {
   signUp,
   signIn,
   me,
   signOut,
} = require("../controllers/user.controller");

userRouter.post("/signup", signUp);
userRouter.post("/signin", signIn);
userRouter.get("/me", auth, me);


module.exports = userRouter;
