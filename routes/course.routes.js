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
} = require("../controllers/course.controller");

courseRouter.get("/", (req, res) => {
   res.sendFile(__dirname + "/public/CourseForm.html");
});
courseRouter.post("/purchase", auth, purchaseCourse);
courseRouter.get("/owned", auth, ownedCourses);
courseRouter.get("/preview", previewCourses);
courseRouter.post("/create", auth, isAdmin, createCourse);
courseRouter.post("/update", auth, isAdmin, updateCourse);
courseRouter.post("/delete", auth, isAdmin, deleteCourse);

module.exports = courseRouter;
