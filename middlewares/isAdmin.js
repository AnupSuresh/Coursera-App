const adminAuth = async (req, res, next) => {
   if (!req.user || req.user.role !== "admin") {
      return res
         .status(403)
         .json({ error: "Access denied, you are not an Admin." });
   }
   next();
};

module.exports = adminAuth;
