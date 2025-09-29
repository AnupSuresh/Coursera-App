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
   addCourseContent,
   getCourseContent,
} = require("../controllers/course.controller");

courseRouter.get("/", (req, res) => {
   res.sendFile(__dirname + "/public/CourseForm.html");
});

// User routes
courseRouter.post("/purchase/:courseId", auth, purchaseCourse);
courseRouter.get("/owned", auth, ownedCourses);
courseRouter.get("/:courseId/content", auth, ownedCourses);

// Public routes
courseRouter.get("/preview", previewCourses);

// Admin routes
courseRouter.post("/create", auth, isAdmin, createCourse);
courseRouter.post("/:courseId/lesson", auth, isAdmin, addCourseContent);
courseRouter.put("/update/:courseId", auth, isAdmin, updateCourse);
courseRouter.delete("/delete/:courseId", auth, isAdmin, deleteCourse);

module.exports = courseRouter;
