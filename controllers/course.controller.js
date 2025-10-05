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
         price: z.number().min(1).max(99999).optional(),
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
         (sum, lesson) => sum + lesson.duration,
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

      res.status(200).json({
         course: {
            id: courseContent.courseId._id,
            title: courseContent.courseId.title,
            description: courseContent.courseId.description,
            "thumbnail-image": courseContent.courseId["thumbnail-image"],
         },
         lessons: courseContent.lessons,
         totalDuration: courseContent.totalDuration,
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

module.exports = {
   previewCourses,
   createCourse,
   updateCourse,
   deleteCourse,
   purchaseCourse,
   ownedCourses,
   addCourseContent,
   getCourseContent,
};
