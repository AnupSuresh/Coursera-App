const { Router } = require("express");
const uploadRouter = Router();
const { z } = require("zod");
const { getS3PresignedPutUrl, deleteS3File } = require("../utils/s3.utils");
const auth = require("../middlewares/auth");

uploadRouter.get("/pre-signed-url", auth, async (req, res) => {
   try {
      const reqQuerySchema = z.object({
         folderName: z.string().trim().min(1).max(50),
         fileName: z.string().trim().min(1).max(100),
         fileType: z.string().trim().min(1).max(20),
      });
      const validationResult = await reqQuerySchema.safeParseAsync(req.query);
      if (!validationResult.success) {
         return res.status(422).json({
            error: "Validation failed",
            details: z.treeifyError(validationResult.error),
         });
      }

      const { folderName, fileName, fileType } = validationResult.data;
      const { url, key } = await getS3PresignedPutUrl(
         folderName,
         fileName,
         fileType
      );

      if (!url || !key) {
         return res.status(500).json({ error: "Error generating url" });
      }

      res.status(200).json({
         message: "Presigned S3 PUT url generated successfully!",
         url,
         key,
      });
   } catch (error) {
      res.status(500).json({
         error: "Internal server error",
         details: error.message,
      });
   }
});

module.exports = uploadRouter;
