const { z } = require("zod");
const CourseModel = require("../models/Course");
const CourseContentModel = require("../models/CourseContent");
const CourseEnrollmentModel = require("../models/CourseEnrollment");
const { deleteS3Files } = require("../utils/s3.utils");
const {
   setCloudfrontCookies,
   refreshCookies,
   getSignedUrlForFile,
} = require("../utils/cdn.utils");

const purchaseCourse = async (req, res) => {
   try {
      const userId = req.user._id;
      const { courseId } = req.params;

      const existingEnrollment = await CourseEnrollmentModel.findOne({
         courseId,
         userId,
         status: "active",
      });

      if (existingEnrollment) {
         return res.status(400).json({
            error: "Already purchased.",
         });
      }

      const course = await CourseModel.findById(courseId);
      if (!course) {
         return res.status(404).json({ error: "Course not found" });
      }

      const expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);

      const enrollment = new CourseEnrollmentModel({
         userId,
         courseId,
         enrolledAt: new Date(),
         expiresAt: expiryDate,
         status: "active",
      });

      await enrollment.save();

      // const setCookies = setCloudfrontCookies(
      //    res,
      //    course.creatorId,
      //    courseId,
      //    expiryDate
      // );

      // console.log("Cookies set:", setCookies);

      res.status(200).json({
         message: "Course purchased successfully!",
         courseId,
         accessExpires: expiryDate,
      });
   } catch (error) {
      console.error("Purchase error:", error);
      res.status(500).json({
         error: "Purchase failed",
         details: error.message,
      });
   }
};
const ownedCourses = async (req, res) => {
   try {
      const userId = req.user._id;
      const ownedCourses = await CourseEnrollmentModel.find({
         userId,
         status: "active",
         $or: [
            {
               expiresAt: { $exists: false },
            },
            { expiresAt: { $gt: new Date() } },
         ],
      }).populate("courseId", "title description thumbnail-image price");

      res.status(200).json({
         courses: ownedCourses.map((c) => ({
            id: c.courseId._id,
            title: c.courseId.title,
            description: c.courseId.description,
            thumbnail: c.courseId["thumbnial-image"],
            price: c.courseId.price,
            enrolledAt: c.enrolledAt,
            expiresAt: c.expiresAt,
            progress: c.progress,
         })),
      });
   } catch (error) {
      console.error("Owned courses error:", error);
      res.status(500).json({
         error: "Failed to fetch owned courses",
         details:
            process.env.NODE_ENV === "development" ? error.message : undefined,
      });
   }
};

const previewCourses = async (req, res) => {
   try {
      const courses = await CourseModel.find().lean();
      res.status(200).json({ courses, message: "Course Preview" });
   } catch (error) {
      return res.status(500).json({
         error: "Internal server error while previewing course.",
         details: error.message,
      });
   }
};

const createCourse = async (req, res) => {
   try {
      const courseBody = z.object({
         title: z.string().min(2).max(30),
         description: z.string().min(2).max(500),
         price: z.number().min(1).max(999999),
         key: z.string().min(10).max(200),
      });

      const validationResult = await courseBody.safeParseAsync(req.body);

      if (!validationResult.success) {
         return res
            .status(422)
            .json({ error: z.treeifyError(validationResult.error) });
      }

      const { title, description, price, key } = validationResult.data;
      const userId = req.user._id;

      const cdnDomain = process.env.CLOUDFRONT_DOMAIN;
      const url = new URL(key, cdnDomain).toString();

      const course = new CourseModel({
         title,
         description,
         price,
         "thumbnail-image": {
            url: url,
            key: key,
         },
         creatorId: userId,
      });
      await course.save();

      res.status(200).json({
         message: "Course created successfully.",
      });
   } catch (error) {
      return res.status(500).json({
         error: "Internal server error while creating course.",
         details: error.message,
      });
   }
};
const updateCourse = async (req, res) => {
   try {
      const courseBody = z.object({
         title: z.string().min(2).max(30).optional(),
         description: z.string().min(2).max(500).optional(),
         price: z.coerce.number().min(1).max(99999).optional(),
         key: z.string().min(2).max(200).optional(),
      });

      const validationResult = await courseBody.safeParseAsync(req.body);

      if (!validationResult.success) {
         return res
            .status(422)
            .json({ error: z.treeifyError(validationResult.error) });
      }
      const { courseId } = req.params;
      const { title, description, price, key } = validationResult.data;

      const existingCourse = await CourseModel.findById(courseId);
      if (!existingCourse) throw new Error("Course not found");

      if (!existingCourse.creatorId.equals(req.user._id)) {
         return res.status(403).json({
            error: "This course was not created by you and you can only update own courses.",
         });
      }

      if (key && existingCourse["thumbnail-image"]?.key) {
         await deleteS3Files(existingCourse["thumbnail-image"].key);
      }

      const cdnDomain = process.env.CLOUDFRONT_DOMAIN;
      const url = new URL(key, cdnDomain).toString();

      await CourseModel.findByIdAndUpdate(courseId, {
         title,
         description,
         price,
         "thumbnail-image": {
            url: url,
            key: key,
         },
      });

      const updatedCourseData = await CourseModel.findById(courseId);

      if (!updatedCourseData) {
         throw new Error("Course not found");
      }

      res.status(200).json({
         updatedCourseData,
         message: "Course updated successfully!",
      });
   } catch (error) {
      return res.status(500).json({
         error: "Internal server error while updating course.",
         details: error.message,
      });
   }
};
const deleteCourse = async (req, res) => {
   try {
      const { courseId } = req.params;
      const deletedCourse = await CourseModel.findByIdAndDelete(courseId);

      if (!deletedCourse) {
         throw new Error("Course not found");
      }
      await deleteS3Files(deletedCourse["thumbnail-image"].key);
      res.status(200).json({ message: "Course deleted successfully!" });
   } catch (error) {
      return res.status(500).json({
         error: "Internal server error while deleting course.",
         details: error.message,
      });
   }
};

const getCourseContent = async (req, res) => {
   try {
      const userId = req.user._id;
      const { courseId } = req.params;

      const enrolled = await CourseEnrollmentModel.findOne({
         userId,
         courseId,
         status: "active",
         $or: [
            { expiresAt: { $exists: false } },
            { expiresAt: { $gt: new Date() } },
         ],
      });
      const course = await CourseModel.findById(courseId);

      if (!enrolled && course.creatorId.toString() !== userId.toString()) {
         return res.status(403).json({
            error: "Course access denied. Please purchase this course to access its content.",
         });
      }

      const courseContent = await CourseContentModel.findOne({
         courseId,
      }).populate("courseId", "title description thumbnail-image creatorId");

      if (!courseContent) {
         return res.status(404).json({ error: "Course content not found" });
      }

      // if (
      //    refreshCookies(
      //       req,
      //       courseContent.courseId.creatorId,
      //       courseId,
      //       enrolled.expiresAt
      //    )
      // ) {
      //    const newExpiryDate = new Date();
      //    newExpiryDate.setFullYear(newExpiryDate.getFullYear() + 1);

      //    enrolled.expiresAt = newExpiryDate;
      //    await enrolled.save();

      //    const cookies = setCloudfrontCookies(
      //       res,
      //       courseContent.courseId.creatorId,
      //       courseId,
      //       newExpiryDate
      //    );
      //    // console.log("Refreshed new Cookies:", cookies);
      // }

      courseContent.lessons.forEach((lesson) => {
         if (lesson.video?.url) {
            const signedVideouUrl = getSignedUrlForFile(lesson.video.url, 120);
            lesson.video.url = signedVideouUrl;
         }
         if (Array.isArray(lesson.notes)) {
            lesson.notes.forEach((note) => {
               if (note.fileUrl) {
                  const signedNoteUrl = getSignedUrlForFile(note.fileUrl, 140);
                  note.fileUrl = signedNoteUrl;
               }
            });
         }
      });
      // console.log(courseContent._id);

      res.status(200).json({
         course: {
            id: courseContent.courseId._id,
            title: courseContent.courseId.title,
            description: courseContent.courseId.description,
            "thumbnail-image": courseContent.courseId["thumbnail-image"],
         },
         courseContent: {
            id: courseContent._id,
            totalDuration: courseContent.totalDuration,
            lessons: courseContent.lessons,
         },
         enrollment: {
            enrolledAt: enrolled?.enrolledAt,
            expiresAt: enrolled?.expiresAt,
            progress: enrolled?.progress,
            status: enrolled?.status,
         },
      });
   } catch (error) {
      console.error("Get course content error:", error);
      res.status(500).json({
         error: "Failed to load course content",
         details: error.message,
      });
   }
};
const addCourseContent = async (req, res) => {
   try {
      const { courseId } = req.params;
      const contentBody = z.object({
         title: z.string().min(2).max(100),
         videoKey: z.string().min(5),
         duration: z.number().min(1).max(10000),
         notes: z.array(
            z.object({
               fileName: z.string(),
               fileKey: z.string(),
               fileType: z.string(),
            })
         ),
      });

      const validationResult = await contentBody.safeParseAsync(req.body);

      if (!validationResult.success) {
         return res
            .status(422)
            .json({ error: z.treeifyError(validationResult.error) });
      }

      const { title, videoKey, duration, notes } = validationResult.data;

      const course = await CourseModel.findById(courseId);
      if (!course) {
         return res.status(404).json({
            error: "Course not found!",
         });
      }

      if (course.creatorId.toString() !== req.user._id.toString()) {
         return res.status(403).json({
            error: "This course was not created by you and you can only add content to your own courses.",
         });
      }

      const cdnDomain = process.env.CLOUDFRONT_DOMAIN;
      const videoUrl = new URL(videoKey, cdnDomain).toString();

      const processedNotes = notes.map((note) => ({
         fileName: note.fileName,
         fileUrl: new URL(note.fileKey, cdnDomain).toString(),
         fileKey: note.fileKey,
         fileType: note.fileType,
      }));

      let courseContent = await CourseContentModel.findOne({ courseId });
      if (!courseContent) {
         courseContent = new CourseContentModel({
            courseId,
            lessons: [],
            totalDuration: 0,
         });
      }

      courseContent.lessons.push({
         title,
         video: {
            url: videoUrl,
            key: videoKey,
         },
         notes: processedNotes,
         duration: duration,
      });

      courseContent.totalDuration = courseContent.lessons.reduce(
         (sum, lesson) => sum + (lesson.duration || 0),
         0
      );

      await courseContent.save();

      res.status(200).json({
         message: "Course content added successfully.",
         totalLessons: courseContent.lessons.length,
         totalDuration: courseContent.totalDuration,
      });
   } catch (error) {
      return res.status(500).json({
         error: "Internal server error while adding course content.",
         details: error.message,
      });
   }
};
const updateCourseContent = async (req, res) => {
   try {
      const { contentId, lessonId } = req.params;

      const contentBody = z.object({
         title: z.string().min(2).max(100).optional(),
         videoKey: z.string().min(5).optional(),
         duration: z.number().min(1).max(10000).optional(),
         notes: z
            .array(
               z.object({
                  fileName: z.string(),
                  fileKey: z.string(),
                  fileType: z.string(),
               })
            )
            .optional(),
      });

      const validationResult = await contentBody.safeParseAsync(req.body);
      if (!validationResult.success) {
         return res
            .status(422)
            .json({ error: z.treeifyError(validationResult.error) });
      }

      const { title, videoKey, duration, notes } = validationResult.data;
      // console.log(contentId);

      const courseContent = await CourseContentModel.findById(
         contentId
      ).populate("courseId", "creatorId");

      if (!courseContent) {
         return res.status(404).json({
            error: "Course content doesn't exist for this course, please create it first!",
         });
      }

      if (!courseContent.courseId.creatorId.equals(req.user._id)) {
         return res.status(403).json({
            error: "This course was not created by you and you can only add or update content of your own courses.",
         });
      }

      const cdnDomain = process.env.CLOUDFRONT_DOMAIN;

      const lesson = courseContent.lessons.id(lessonId);
      if (!lesson) {
         return res
            .status(404)
            .json({ error: "Lesson not found in this content." });
      }

      if (videoKey && lesson.video?.key) {
         await deleteS3Files(lesson.video.key);
      }

      if (title) lesson.title = title;

      if (videoKey) {
         const videoUrl = new URL(videoKey, cdnDomain).toString();
         lesson.video.key = videoKey;
         lesson.video.url = videoUrl;
      }

      if (notes && notes.length) {
         const processedNotes = notes.map((note) => ({
            fileName: note.fileName,
            fileUrl: new URL(note.fileKey, cdnDomain).toString(),
            fileKey: note.fileKey,
            fileType: note.fileType,
         }));
         lesson.notes.push(...processedNotes);
      }

      if (duration) {
         lesson.duration = duration;
      }

      courseContent.totalDuration = courseContent.lessons.reduce(
         (sum, lesson) => sum + (lesson.duration || 0),
         0
      );

      await courseContent.save();
      return res.status(200).json({
         message: "Lesson updated successfully!",
         updatedLesson: lesson,
         totalDuration: courseContent.totalDuration,
      });
   } catch (error) {
      console.error("Error updating course content:", error);
      return res.status(500).json({
         error: "Internal server error while updating course content.",
         details: error.message,
      });
   }
};
const deleteCourseContent = async (req, res) => {
   try {
      const { contentId } = req.params;
      const deletedCourseContent =
         await CourseContentModel.findByIdAndDelete(contentId);

      if (!deletedCourseContent) {
         throw new Error("Course content not found");
      }
      const deletedFileKeys = deletedCourseContent.lessons.flatMap((lesson) => {
         const videoKey = lesson.video?.key ? [lesson.video.key] : [];
         const noteKeys = lesson.notes.map((n) => n.fileKey).filter(Boolean);
         return [...videoKey, ...noteKeys];
      });
      if (deletedFileKeys.length > 0) {
         await deleteS3Files(deletedFileKeys);
      }

      res.status(200).json({ message: "Course content deleted successfully!" });
   } catch (error) {
      return res.status(500).json({
         error: "Internal server error while deleting course content.",
         details: error.message,
      });
   }
};
const deleteCourseLesson = async (req, res) => {
   try {
      const { lessonId } = req.params;
      const courseContent = await CourseContentModel.findOne({
         "lessons._id": lessonId,
      });

      if (!courseContent) {
         throw new Error("Course content not found");
      }

      let lesson = courseContent.lessons.id(lessonId);
      if (!lesson) {
         throw new Error("Lesson not found");
      }

      const lessonDuration = lesson.duration;

      const deletedFileKeys = [
         ...(lesson.video?.key ? [lesson.video.key] : []),
         ...lesson.notes.map((n) => n.fileKey).filter(Boolean),
      ];

      await CourseContentModel.updateOne(
         { "lessons._id": lessonId },
         {
            $pull: { lessons: { _id: lessonId } },
            $inc: { totalDuration: -lessonDuration },
         }
      );

      await deleteS3Files(deletedFileKeys);

      res.status(200).json({ message: "Lesson deleted successfully!" });
   } catch (error) {
      return res.status(500).json({
         error: "Internal server error while deleting lesson.",
         details: error.message,
      });
   }
};
const deleteLessonNotes = async (req, res) => {
   try {
      const { noteId } = req.params;
      const courseContent = await CourseContentModel.findOne({
         "lessons.notes._id": noteId,
      });

      if (!courseContent) {
         throw new Error("Course content not found");
      }

      let targetNote = null;
      for (const lesson of courseContent.lessons) {
         targetNote = lesson.notes.id(noteId); // .id() works on lesson.notes
         if (targetNote) break;
      }

      if (!targetNote) {
         throw new Error("Note not found");
      }

      const deletedFileKeys = targetNote.fileKey ? [targetNote.fileKey] : [];

      await CourseContentModel.updateOne(
         { "lessons.notes._id": noteId },
         {
            $pull: {
               "lessons.$.notes": { _id: noteId },
            },
         }
      );

      if (deletedFileKeys.length > 0) {
         await deleteS3Files(deletedFileKeys);
      }

      res.status(200).json({ message: "Note deleted successfully!" });
   } catch (error) {
      return res.status(500).json({
         error: "Internal server error while deleting note.",
         details: error.message,
      });
   }
};

module.exports = {
   previewCourses,
   createCourse,
   updateCourse,
   deleteCourse,
   purchaseCourse,
   ownedCourses,
   getCourseContent,
   addCourseContent,
   updateCourseContent,
   deleteCourseContent,
   deleteCourseLesson,
   deleteLessonNotes,
};
