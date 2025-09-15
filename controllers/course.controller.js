const { z } = require("zod");
const CourseModel = require("../models/Course");

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
         price: z.number().min(1).max(99999),
      });

      const validationResult = await courseBody.safeParseAsync(req.body);

      if (!validationResult.success) {
         return res
            .status(422)
            .json({ error: z.treeifyError(validationResult.error) });
      }

      const { title, description, price } = validationResult.data;
      const userId = req.user._id;

      const course = new CourseModel({
         title,
         description,
         price,
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
      });

      const validationResult = await courseBody.safeParseAsync(req.body);

      if (!validationResult.success) {
         return res
            .status(422)
            .json({ error: z.treeifyError(validationResult.error) });
      }
      const { courseId } = req.params;
      const { title, description, price } = validationResult.data;
      await CourseModel.findByIdAndUpdate(courseId, {
         title,
         description,
         price,
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
      res.status(200).json({ message: "Course deleted successfully!" });
   } catch (error) {
      return res.status(500).json({
         error: "Internal server error while deleting course.",
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
