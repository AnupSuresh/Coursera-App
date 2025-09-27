const mongoose = require("mongoose");
const { Schema } = mongoose;

const LessonSchema = new Schema({
   title: String,
   video: {
      url: String,
      key: String,
   },
   notes: [
      {
         fileName: String,
         fileUrl: String,
         fileType: {
            type: String,
            enum: [
               "application/pdf", // .pdf
               "text/plain", // .txt
               "text/markdown", // .md
               "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
               "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
               "image/jpeg", // .jpg
               "image/png", // .png
               "application/json", // .json
               "text/html", // .html
            ],
         },
      },
   ],
   duration: Number,
});

const CourseContent = new Schema({
   courseId: Schema.Types.ObjectId,
   lessons: [LessonSchema],
   totalDuration: Number,
});
const CourseContenModel = mongoose.model("CourseContent", CourseContent);
module.exports = CourseContenModel;
