const { z } = require("zod");
const CourseModel = require("../models/Course");
const { deleteS3Files } = require("../utils/s3.utils");

const purchaseCourse = async (req, res) => {
   try {
   } catch (error) {}
};
const ownedCourses = async (req, res) => {
   try {
   } catch (error) {}
};

const previewCourses = async (req, res) => {
   try {
      const courses = await CourseModel.find();
      res.status(200).json({ courses: courses, message: "Course Preview" });
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
      const url = `${cdnDomain}/${key}`;

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
      const url = `${cdnDomain}/${key}`;

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
      const contentBody = z.object({
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
      const url = `${cdnDomain}/${key}`;

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

module.exports = {
   previewCourses,
   createCourse,
   updateCourse,
   deleteCourse,
   purchaseCourse,
   ownedCourses,
};
