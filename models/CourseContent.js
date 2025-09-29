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
         fileKey: String,
         fileType: {
            type: String,
            enum: [
               "application/pdf",
               "text/plain",
               "text/markdown",
               "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
               "application/vnd.openxmlformats-officedocument.presentationml.presentation",
               "image/jpeg",
               "image/png",
               "image/avif",
               "application/json",
               "text/html",
            ],
         },
      },
   ],
   duration: Number,
});

const CourseContentSchema = new Schema({
   courseId: { type: Schema.Types.ObjectId, ref: "course", required: true },
   lessons: [LessonSchema],
   totalDuration: Number,
});

module.exports = mongoose.model("CourseContent", CourseContentSchema);
