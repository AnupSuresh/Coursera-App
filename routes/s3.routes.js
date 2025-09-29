const { Router } = require("express");
const uploadRouter = Router();
const { z } = require("zod");
const { getS3PresignedPutUrl, deleteS3Files } = require("../utils/s3.utils");
const auth = require("../middlewares/auth");

// Route to get a presigned-url
uploadRouter.get("/upload/thumbnail/pre-signed-url", auth, async (req, res) => {
   try {
      const accessType = "public";
      // Folder path verification using zod
      const safeCourseName = z
         .string()
         .trim()
         .min(3)
         .max(100)
         .regex(/^[a-zA-Z0-9_-]+(?: [a-zA-Z0-9_-]+)*$/, "Invalid course name") // Checks for allowed characters only
         .refine((val) => !val.startsWith("/") && !val.includes("//"), {
            message: "Folder path must not start with '/' or contain '//' ",
         }) // Checks for leading and double slashes
         .refine((val) => !val.includes(".."), {
            message: "Folder path must not contain '..'",
         }); // Checks for double dots

      // File name verification using zod
      const safeFileName = z
         .string()
         .trim()
         .min(1)
         .max(100)
         .regex(/^[a-zA-Z0-9_\-\.]+$/, "Invalid file name") // Checks for allowed characters only
         .refine(
            (val) => val.includes(".") && val.split(".").pop().length > 1,
            {
               message: "File name must include an extension",
            }
         ); // Checks if the file name has an extension

      // Schema for request query values using zod
      const reqQuerySchema = z.object({
         courseName: safeCourseName,
         fileName: safeFileName,
         fileType: z.string().trim().min(1).max(50),
      });

      // Schema validation
      const validationResult = await reqQuerySchema.safeParseAsync(req.query);

      // Returs error for invalid query values that doesn't match the defined schema
      if (!validationResult.success) {
         return res.status(422).json({
            error: "Validation failed",
            details: z.treeifyError(validationResult.error),
         });
      }

      // Destructuring the values from the validated query values
      const { courseName, fileType, fileName } = validationResult.data;

      // Generating pre-signed url
      const { url, key, contentType } = await getS3PresignedPutUrl(
         accessType,
         req.user._id,
         courseName,
         fileName,
         fileType,
         300
      );

      if (!url || !key || !contentType) {
         return res.status(500).json({ error: "Error generating url" });
      }

      res.status(200).json({
         message: "Presigned S3 PUT url generated successfully!",
         url,
         key,
      });
   } catch (error) {
      console.error("Error generating presigned URL:", error.stack);
      if (
         (error.message && error.message.includes("too long")) ||
         error.message.includes("Missing required")
      ) {
         return res.status(400).json({ error: err.message });
      }
      res.status(500).json({
         error: "Internal server error",
         details:
            process.env.NODE_ENV === "development" ? error.message : undefined,
      });
   }
});
uploadRouter.delete("/delete", auth, async (req, res) => {
   try {
      const { keys } = req.query;
      const deleted = await deleteS3Files(keys);
      console.log(deleted);
      res.status(200).json({ message: "File deleted successfully" });
   } catch (error) {
      res.status(500).json({
         error: "Internal server error",
         details:
            process.env.NODE_ENV === "development" ? error.message : undefined,
      });
   }
});

uploadRouter.get(
   "/upload/lesson-video/pre-signed-url",
   auth,
   async (req, res) => {
      try {
         const accessType = "private";

         const safeCourseId = z
            .string()
            .trim()
            .length(24, "Course ID must be exactly 24 characters")
            .regex(/^[a-f0-9]{24}$/i, "Invalid course ID format");

         const safeFileName = z
            .string()
            .trim()
            .min(1)
            .max(100)
            .regex(/^[a-zA-Z0-9_\-\.]+$/, "Invalid file name")
            .refine(
               (val) => val.includes(".") && val.split(".").pop().length > 1,
               {
                  message: "File name must include an extension",
               }
            );

         const reqQuerySchema = z.object({
            courseId: safeCourseId,
            fileName: safeFileName,
            fileType: z.string().trim().min(1).max(50),
         });

         const validationResult = await reqQuerySchema.safeParseAsync(
            req.query
         );

         if (!validationResult.success) {
            return res.status(422).json({
               error: "Validation failed",
               details: z.treeifyError(validationResult.error),
            });
         }

         const { courseId, fileName, fileType } = validationResult.data;

         // Generating pre-signed url
         const { url, key, contentType } = await getS3PresignedPutUrl(
            accessType,
            req.user._id,
            courseId,
            fileName,
            fileType,
            300
         );

         if (!url || !key || !contentType) {
            return res.status(500).json({ error: "Error generating url" });
         }

         res.status(200).json({
            message: "Presigned S3 PUT url generated successfully!",
            url,
            key,
         });
      } catch (error) {
         console.error("Error generating presigned URL:", error.stack);
         if (
            (error.message && error.message.includes("too long")) ||
            error.message.includes("Missing required")
         ) {
            return res.status(400).json({ error: err.message });
         }
         res.status(500).json({
            error: "Internal server error",
            details:
               process.env.NODE_ENV === "development"
                  ? error.message
                  : undefined,
         });
      }
   }
);
uploadRouter.get(
   "/upload/lesson-file/pre-signed-url",
   auth,
   async (req, res) => {
      try {
         const accessType = "private";

         const safeCourseId = z
            .string()
            .trim()
            .length(24, "Course ID must be exactly 24 characters")
            .regex(/^[a-f0-9]{24}$/i, "Invalid course ID format");

         const safeFileName = z
            .string()
            .trim()
            .min(1)
            .max(100)
            .regex(/^[a-zA-Z0-9_\-\.]+$/, "Invalid file name")
            .refine(
               (val) => val.includes(".") && val.split(".").pop().length > 1,
               {
                  message: "File name must include an extension",
               }
            );

         const reqQuerySchema = z.object({
            courseId: safeCourseId,
            fileName: safeFileName,
            fileType: z.string().trim().min(1).max(50),
         });

         const validationResult = await reqQuerySchema.safeParseAsync(
            req.query
         );

         if (!validationResult.success) {
            return res.status(422).json({
               error: "Validation failed",
               details: z.treeifyError(validationResult.error),
            });
         }

         const { courseId, fileName, fileType } = validationResult.data;

         // Generating pre-signed url
         const { url, key, contentType } = await getS3PresignedPutUrl(
            accessType,
            req.user._id,
            courseId,
            fileName,
            fileType,
            300
         );

         if (!url || !key || !contentType) {
            return res.status(500).json({ error: "Error generating url" });
         }

         res.status(200).json({
            message: "Presigned S3 PUT url generated successfully!",
            url,
            key,
         });
      } catch (error) {
         console.error("Error generating presigned URL:", error.stack);
         if (
            (error.message && error.message.includes("too long")) ||
            error.message.includes("Missing required")
         ) {
            return res.status(400).json({ error: err.message });
         }
         res.status(500).json({
            error: "Internal server error",
            details:
               process.env.NODE_ENV === "development"
                  ? error.message
                  : undefined,
         });
      }
   }
);
module.exports = uploadRouter;
