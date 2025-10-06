const { Router } = require("express");
const courseRouter = Router();
const auth = require("../middlewares/auth");
const isAdmin = require("../middlewares/isAdmin");
const {
   createCourse,
   updateCourse,
   deleteCourse,
   previewCourses,
   purchaseCourse,
   ownedCourses,
   getCourseContent,
   addCourseContent,
   updateCourseContent,
   deleteCourseContent,
   deleteCourseLesson,
   deleteLessonNotes,
} = require("../controllers/course.controller");

courseRouter.get("/", (req, res) => {
   res.sendFile(__dirname + "/public/CourseForm.html");
});

// User routes
courseRouter.post("/purchase/:courseId", auth, purchaseCourse);
courseRouter.get("/owned", auth, ownedCourses);
courseRouter.get("/:courseId/content", auth, getCourseContent);

// Public routes
courseRouter.get("/preview", previewCourses);

// Admin routes
courseRouter.post("/create", auth, isAdmin, createCourse);
courseRouter.post("/:courseId/lesson", auth, isAdmin, addCourseContent);
courseRouter.put(
   "/:contentId/:lessonId/update",
   auth,
   isAdmin,
   updateCourseContent
);
courseRouter.put("/update/:courseId", auth, isAdmin, updateCourse);
courseRouter.delete("/delete/:courseId", auth, isAdmin, deleteCourse);
courseRouter.delete(
   "/delete/content/:contentId",
   auth,
   isAdmin,
   deleteCourseContent
);
courseRouter.delete(
   "/delete/lesson/:lessonId",
   auth,
   isAdmin,
   deleteCourseLesson
);
courseRouter.delete("/delete/notes/:noteId", auth, isAdmin, deleteLessonNotes);

module.exports = courseRouter;
