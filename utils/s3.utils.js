const { PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { bucketName, s3Client } = require("../config/s3.config");
const crypto = require("crypto");
const path = require("path");

const generateUniqueKey = (fileName, folderName) => {
   if (!fileName || !folderName) {
      throw new Error(
         "Both fileName and folderName are required to generate S3 key"
      );
   }
   const sanitize = (str) =>
      str
         .trim()
         .toLowerCase()
         .replace(/\s+/g, "-")
         .replace(/[^a-z0-9-_]/g, "");
   const sanitizedFileName = sanitize(path.parse(fileName).name);
   const sanitizedFolder = sanitize(folderName);
   const timestamp = Date.now();
   const randomString = crypto.randomBytes(8).toString("hex");
   const ext = path.parse(fileName).ext || "";
   return `Coursera-App/${sanitizedFolder}/${timestamp}-${randomString}-${sanitizedFileName}${ext}`;
};

const getS3PresignedPutUrl = async (
   folderName,
   fileName,
   contentType,
   expiresIn = 60
) => {
   try {
      if (!fileName || !contentType || !folderName) {
         throw new Error(
            "File Name, Folder Name and contentType are required to generate presigned URL"
         );
      }
      const key = generateUniqueKey(fileName, folderName);
      const command = new PutObjectCommand({
         Bucket: bucketName,
         Key: key,
         ContentType: contentType,
      });

      const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });

      return { url: signedUrl, key };
   } catch (error) {
      console.error("Error generating S3 presigned URL:", err);
      throw new Error("Failed to generate S3 presigned URL");
   }
};

const deleteS3File = async (key) => {
   try {
      if (!key) {
         throw new Error("Key is required for deletion");
      }

      const command = new DeleteObjectCommand({
         Bucket: bucketName,
         Key: key,
      });
      await s3Client.send(command);
   } catch (error) {
      console.error(`Error deleting S3 file with key ${key}:`, err);
      throw new Error("Failed to delete S3 file");
   }
};

module.exports = { getS3PresignedPutUrl, deleteS3File };
