const { verifyAccessToken } = require("../utils/jwt.utils");
const userModel = require("../models/User");
const authentication = async (req, res, next) => {
   try {
      const { accessToken } = req.cookies;
      if (!accessToken) {
         return res.status(401).json({ error: "Token not provided." });
      }

      const payload = verifyAccessToken(accessToken);
      if (!payload.id) {
         return res.status(401).json({ error: "Invalid token payload." });
      }

      const user = await userModel.findById(payload.id);
      if (!user) {
         return res.status(401).json({ error: "User no longer exists." });
      }
      
      req.user = user.toObject();
      next();
   } catch (error) {
      console.error("JWT verification failed:", error);
      return res.status(401).json({ error: "Invalid or expired token." });
   }
};

module.exports = authentication;
