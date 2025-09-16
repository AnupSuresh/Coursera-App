const mongoose = require("mongoose");
const { Schema } = mongoose;

const Course = new Schema({
   title: String,
   description: String,
   price: Number,
   "thumbnail-image": {
      url: String,
      key: String,
   },
   creatorId: {
      type: Schema.Types.ObjectId,
      ref: "user",
   },
});

const CourseModel = mongoose.model("course", Course);
module.exports = CourseModel;
