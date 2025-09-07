const { z } = require("zod");
const userModel = require("../models/User");
const { generateTokens, verifyRefreshToken } = require("../utils/jwt.utils");
const connectRedis = require("../config/redis.config");

const signUp = async (req, res) => {
   try {
      const signUpDataScehma = z.object({
         firstName: z.string().min(2),
         lastName: z.string().min(2),
         email: z
            .string()
            .email()
            .refine(
               async (val) => {
                  const user = await userModel.findOne({ email: val });
                  return !user;
               },
               { message: "User already exists please sign in." }
            ),
         password: z
            .string()
            .min(8)
            .max(50)
            .regex(
               /^(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_])(?=.*\d)/,
               "Password must contain at least 1 lowercase letter, 1 uppercase letter, and 1 special character"
            ),
         adminSecret: z.string().optional(),
      });

      const validationResult = await signUpDataScehma.safeParseAsync(req.body);
      if (!validationResult.success) {
         const formattedError = z.treeifyError(validationResult.error);
         return res.status(422).json({ error: formattedError });
      }

      const { firstName, lastName, email, password, adminSecret } =
         validationResult.data;

      let role = "user";
      if (adminSecret === process.env.ADMIN_SECRET_KEY) {
         role = "admin";
      }

      if (email === process.env.ADMIN_EMAIL) {
         role = "admin";
      }

      const user = new userModel({
         firstName: firstName,
         lastName: lastName,
         email: email,
         password: password,
         role: role,
      });

      await user.save();
      res.status(200).json({ error: "Signup Successful!" });
   } catch (error) {
      return res.status(500).json({
         error: `An error occurred during signup. Please try again later.`,
         details: error.message,
      });
   }
};
const signIn = async (req, res) => {
   try {
      const signInDataScehma = z.object({
         email: z.string().email(),
         password: z
            .string()
            .min(8)
            .max(50)
            .regex(
               /^(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_])(?=.*\d)/,
               "Password must contain at least 1 lowercase letter, 1 uppercase letter, and 1 special character"
            ),
      });

      const validationResult = await signInDataScehma.safeParseAsync(req.body);
      if (!validationResult.success) {
         const formattedError = z.treeifyError(validationResult.error);
         return res.status(422).json({ error: formattedError });
      }

      const { email, password } = validationResult.data;
      const user = await userModel
         .findOne({ email: email })
         .select("+password");
      if (!user) {
         return res.status(404).json({
            error: "User not found, please signup first.",
         });
      }

      const passMatch = await user.verifyPassword(password);
      if (!passMatch) {
         return res.status(401).json({ error: "Invalid Credentials" });
      }

      const { accessToken, refreshToken } = generateTokens({
         id: user._id,
         role: user.role,
      });

      const redisClient = await connectRedis();
      await redisClient.setex(
         `refresh:${user._id}`,
         7 * 24 * 60 * 60,
         refreshToken
      );

      res.cookie("accessToken", accessToken, {
         httpOnly: true,
         secure: process.env.NODE_ENV === "production",
         sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
         maxAge: 15 * 60 * 1000, // 15 minutes in miliseconds
         path: "/",
      });
      res.cookie("refreshToken", refreshToken, {
         httpOnly: true,
         secure: process.env.NODE_ENV === "production",
         sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
         maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in miliseconds
         path: "/",
      });

      res.status(200).json({ message: "Sign In successfull!" });
   } catch (error) {
      console.log(error);
      return res.status(500).json({ error: "Internal Server Error" });
   }
};
const me = (req, res) => {
   try {
      res.status(200).json({ user: req.user });
   } catch (error) {
      console.log(error);
      return res.status(500).json({ error: "Internal Server Error" });
   }
};
const refreshToken = async (req, res) => {
   try {
      const { refreshToken } = req.cookies;
      if (!refreshToken) {
         return res.status(401).json({ error: "Token not provided." });
      }
      const decoded = verifyRefreshToken(refreshToken);
      const storedRefreshToken = await redisClient.get(`refresh:${decoded.id}`);
      if (storedRefreshToken !== refreshToken) {
         return res.status(401).json({ error: "Token is Invalid" });
      }
      const { accessToken, refreshToken: newRefreshToken } = generateTokens({
         id: decoded.id,
         role: decoded.role,
      });

      await redisClient.setex(
         `refresh:${decoded.id}`,
         7 * 24 * 60 * 60,
         newRefreshToken
      );

      res.cookie("accessToken", accessToken, {
         httpOnly: true,
         secure: process.env.NODE_ENV === "production",
         sameSite: "lax",
         maxAge: 15 * 60 * 1000,
      });

      res.cookie("refreshToken", newRefreshToken, {
         httpOnly: true,
         secure: process.env.NODE_ENV === "production",
         sameSite: "lax",
         maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.status(200).json({ message: "Token refreshed" });
   } catch (error) {
      console.error("JWT verification failed:", error);
      return res.status(401).json({ error: "Invalid or expired token." });
   }
};
const signOut = async (req, res) => {
   res.clearCookie("accessToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
      path: "/",
   });
   res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
      path: "/",
   });
   res.status(200).json({ message: "Logged out successfully." });
};

module.exports = {
   signUp,
   signIn,
   signOut,
   me,
   refreshToken,
};
