const { PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { bucketName, s3Client } = require("../config/s3.config");
const crypto = require("crypto");
const path = require("path");
const mime = require("mime-types");

const rootFolder = process.env.AWS_ROOT_FOLDER || "weird";
const maxSegmentBytes = Number(process.env.MAX_SEGMENT_BYTES) || 200;
const maxKeyBytes = Number(process.env.MAX_KEY_BYTES) || 900;

const allowedAccessTypes = process.env.ALLOWED_ACCESS_TYPES
   ? process.env.ALLOWED_ACCESS_TYPES.split(",").map((type) =>
        type.trim().toLowerCase()
     )
   : [];

const allowedContentTypes = process.env.ALLOWED_CONTENT_TYPE
   ? process.env.ALLOWED_CONTENT_TYPE.split(",").map((type) =>
        type.trim().toLowerCase()
     )
   : [];

const contentTypeCategories = {
   // Images
   "image/jpeg": "images",
   "image/jpg": "images",
   "image/png": "images",
   "image/gif": "images",
   "image/webp": "images",
   "image/bmp": "images",
   "image/svg+xml": "images",
   "image/tiff": "images",
   "image/ico": "images",
   "image/heic": "images",
   "image/heif": "images",

   // Videos
   "video/mp4": "videos",
   "video/avi": "videos",
   "video/quicktime": "videos",
   "video/x-msvideo": "videos",
   "video/x-ms-wmv": "videos",
   "video/x-flv": "videos",
   "video/webm": "videos",
   "video/mkv": "videos",
   "video/x-matroska": "videos",
   "video/3gpp": "videos",
   "video/x-ms-asf": "videos",
   "video/mp2t": "videos",

   // Audio
   "audio/mpeg": "audio",
   "audio/mp3": "audio",
   "audio/wav": "audio",
   "audio/ogg": "audio",
   "audio/mp4": "audio",
   "audio/aac": "audio",
   "audio/flac": "audio",
   "audio/x-ms-wma": "audio",
   "audio/webm": "audio",
   "audio/x-wav": "audio",

   // Documents
   "application/pdf": "documents",
   "application/msword": "documents",
   "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      "documents",
   "application/vnd.ms-excel": "documents",
   "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      "documents",
   "application/vnd.ms-powerpoint": "documents",
   "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      "documents",
   "text/plain": "documents",
   "text/rtf": "documents",
   "application/rtf": "documents",
   "text/csv": "documents",
   "application/vnd.oasis.opendocument.text": "documents",
   "application/vnd.oasis.opendocument.spreadsheet": "documents",
   "application/vnd.oasis.opendocument.presentation": "documents",

   // Archives
   "application/zip": "archives",
   "application/x-rar-compressed": "archives",
   "application/x-7z-compressed": "archives",
   "application/x-tar": "archives",
   "application/gzip": "archives",
   "application/x-zip-compressed": "archives",

   // Code/Development files (you might want these in documents or create a separate category)
   "application/json": "documents",
   "application/xml": "documents",
   "text/xml": "documents",
   "application/javascript": "documents",
   "text/javascript": "documents",
   "text/html": "documents",
   "text/css": "documents",
   "text/markdown": "documents",
   "application/x-yaml": "documents",
   "text/yaml": "documents",
};

const getContentCategory = (contentType) => {
   if (!contentType) {
      return "other";
   }

   const contentCategory = contentTypeCategories[contentType];
   if (contentCategory) return contentCategory;

   const mainType = contentType.split("/");
   switch (mainType) {
      case "image":
         return "images";
      case "video":
         return "videos";
      case "audio":
         return "audio";
      case "text":
         return "documents";
      case "application":
         // Some application types that are commonly documents
         if (
            mainType.includes("document") ||
            mainType.includes("office") ||
            mainType.includes("sheet") ||
            mainType.includes("presentation") ||
            mainType.includes("pdf")
         ) {
            return "documents";
         }
         // Some application types that are archives
         if (
            mainType.includes("zip") ||
            mainType.includes("compressed") ||
            mainType.includes("archive")
         ) {
            return "archives";
         }
         return "other";
      default:
         return "other";
   }
};

const sanitize = (str = "") =>
   String(str || "") // Ensure input is a string; fallback to empty string if null/undefined
      .trim() // Remove leading and trailing whitespace
      .toLowerCase() // Convert all characters to lowercase
      .replace(/\.+/g, "-") // Replace one or more dots (.) with a single dash -
      .replace(/\s+/g, "-") // Replace one or more whitespace characters with a single dash -
      .replace(/[^a-z0-9-_]/g, "") // Remove all characters except lowercase letters, digits, dash (-), or underscore (_)
      .replace(/-+/g, "-") // Collapse consecutive dashes into a single dash
      .replace(/^-+|-+$/g, ""); // Remove leading or trailing dashes

const validateSegmentLength = (name, segment) => {
   if (segment === null) return;
   const bytes = Buffer.byteLength(String(segment), "utf8");
   if (bytes === 0) throw new Error(`${name} is empty after sanitization`);
   if (bytes > maxSegmentBytes) {
      throw new Error(
         `${name} is too long (${bytes} bytes). Maximum allowed per segment is ${maxSegmentBytes} bytes.`
      );
   }
};

const generateUniqueKey = (
   accessType,
   userId,
   courseName,
   fileName,
   contentType
) => {
   if (!accessType || !userId || !courseName || !contentType || !fileName) {
      throw new Error("Some required fields are missing");
   }
   const sanitizedAccessType = sanitize(accessType);
   const sanitizedUserId = sanitize(userId);
   const sanitizedCourseName = sanitize(courseName);
   const categoryFolder = getContentCategory(contentType);
   const sanitizedCategoryFolder = sanitize(
      String(categoryFolder).replace(/\//g, "-")
   );
   const sanitizedFileName = sanitize(path.parse(fileName).name);
   if (
      !sanitizedAccessType ||
      !sanitizedUserId ||
      !sanitizedCourseName ||
      !sanitizedCategoryFolder ||
      !sanitizedFileName
   ) {
      throw new Error("Sanitization failed for one of more segments.");
   }

   validateSegmentLength("access type", sanitizedAccessType);
   validateSegmentLength("user id", sanitizedUserId);
   validateSegmentLength("course name", sanitizedCourseName);
   validateSegmentLength("content folder", sanitizedCategoryFolder);
   validateSegmentLength("file name", sanitizedFileName);

   const folderSegment = [
      rootFolder,
      sanitizedAccessType,
      sanitizedUserId,
      sanitizedCourseName,
      sanitizedCategoryFolder,
   ];

   const timestamp = Date.now();
   const randomString = crypto.randomBytes(8).toString("hex");
   const ext = path.parse(fileName).ext || "";

   const fileSegment = `${timestamp}-${randomString}-${sanitizedFileName}${ext}`;

   const keyCandidate = `${folderSegment.join("/")}/${fileSegment}`;

   const keyByteSize = Buffer.byteLength(keyCandidate, "utf8");
   if (keyByteSize > maxKeyBytes) {
      throw new Error(
         `Generated key is too long (${keyByteSize} bytes). Maximum key size is ${maxKeyBytes} bytes. Try shorter file/folder names.`
      );
   }
   return keyCandidate;
};

const clampExpiresIn = (expiry) => {
   const maxExpiry = 3600;
   const minExpiry = 60;
   return Math.max(Math.min(expiry, maxExpiry), minExpiry);
};

const getS3PresignedPutUrl = async (
   accessType,
   userId,
   courseName,
   fileName,
   contentType,
   expiresIn = 60
) => {
   try {
      if (!fileName || !courseName || !userId || !accessType) {
         throw new Error(
            "File Name, Folder Name and accessType are required to generate presigned URL"
         );
      }

      if (!contentType) {
         const ext = path.parse(fileName).ext;
         contentType = mime.lookup(ext) || "application/octet-stream";
      }

      if (!allowedContentTypes.includes(contentType.toLowerCase())) {
         throw new Error(`Invalid file type: ${contentType}`);
      }

      if (!allowedAccessTypes.includes(accessType)) {
         throw new Error(`Invalid access type: ${accessType}`);
      }

      const key = generateUniqueKey(
         accessType,
         userId,
         courseName,
         fileName,
         contentType
      );

      const command = new PutObjectCommand({
         Bucket: bucketName,
         Key: key,
         ContentType: contentType,
      });

      expiresIn = clampExpiresIn(Number(expiresIn) || 60);

      const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });

      return { url: signedUrl, key, contentType };
   } catch (error) {
      console.error("Error generating S3 presigned URL:", error.stack || error);
      throw new Error(`Failed to generate S3 presigned URL: ${error.message}`);
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
      console.error(`Error deleting S3 file with key ${key}:`, error);
      throw new Error(`Failed to delete S3 file: ${error.message}`);
   }
};

module.exports = { getS3PresignedPutUrl, deleteS3File };
