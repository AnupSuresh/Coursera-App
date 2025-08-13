const jwt = require("jsonwebtoken");

const generateBearerToken = (payload) => {
   try {
      const token = jwt.sign(payload, process.env.JWT_SECRET, {
         expiresIn: "7d",
      });
      return `${token}`;
   } catch (error) {
      console.log(error.message);
      throw error;
   }
};

const verifyBearerToken = (token) => {
   try {
      const pureToken = token.startsWith("Bearer ")
         ? token.split(" ")[1]
         : token;
      return jwt.verify(pureToken, process.env.JWT_SECRET);
   } catch (error) {
      if (error.name === "TokenExpiredError") {
         console.log("JWT has expired");
      } else if (error.name === "JsonWebTokenError") {
         console.log("Invalid JWT");
      }
      throw error;
   }
};

module.exports = {
   generateBearerToken,
   verifyBearerToken,
};
