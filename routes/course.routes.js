const { Router } = require("express");
const courseRouter = Router();
const {
   preview,
   purchase,
   purchases,
} = require("../controllers/course.controller");

courseRouter.get("/preview", preview);
courseRouter.post("/purchase", purchase);
courseRouter.get("/purchases", purchases);

module.exports =  courseRouter ;
