const jwt = require("jsonwebtoken");

const ACCESS_TOKEN_EXPIRES = "15m";
const REFRESH_TOKEN_EXPIRES = "7d";

const generateTokens = (payload) => {
   try {
      const accessToken = jwt.sign(
         { id: payload.id, role: payload.role },
         process.env.JWT_ACCESS_SECRET,
         {
            expiresIn: ACCESS_TOKEN_EXPIRES,
         }
      );
      const refreshToken = jwt.sign(
         { id: payload.id, role: payload.role },
         process.env.JWT_REFRESH_SECRET,
         {
            expiresIn: REFRESH_TOKEN_EXPIRES,
         }
      );
      return { accessToken, refreshToken };
   } catch (error) {
      console.log(error.message);
      throw error;
   }
};

const verifyAccessToken = (token) => {
   try {
      const accessToken = token;
      const decodedData = jwt.verify(
         accessToken,
         process.env.JWT_ACCESS_SECRET
      );
      return decodedData;
   } catch (error) {
      if (error.name === "TokenExpiredError") {
         console.log("JWT has expired", error.stack);
      } else if (error.name === "JsonWebTokenError") {
         console.log("Invalid JWT");
      }
      throw error;
   }
};
const verifyRefreshToken = (token) => {
   try {
      const decodedData = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
      return decodedData;
   } catch (error) {
      if (error.name === "TokenExpiredError") {
         console.log("JWT has expired refresh token error", error.stack);
      } else if (error.name === "JsonWebTokenError") {
         console.log("Invalid JWT");
      }
      throw error;
   }
};

module.exports = {
   generateTokens,
   verifyAccessToken,
   verifyRefreshToken,
};
