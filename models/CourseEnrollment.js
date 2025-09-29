const mongoose = require("mongoose");
const { Schema } = mongoose;

const CourseEnrollmentSchema = new Schema(
   {
      userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
      courseId: { type: Schema.Types.ObjectId, ref: "course", required: true },
      enrolledAt: { type: Date, default: Date.now },
      expiresAt: { type: Date },
      status: {
         type: String,
         enum: ["active", "suspended", "expired"],
         default: "active",
      },
      progress: {
         completedLessons: [{ type: Schema.Types.ObjectId }],
         lastAccessedLesson: Schema.Types.ObjectId,
         completionPercentage: { type: Number, default: 0 },
      },
   },
   { timestamps: true }
);

CourseEnrollmentSchema.index({ userId: 1, courseId: 1 }, { unique: true });

module.exports = mongoose.model("CourseEnrollment", CourseEnrollmentSchema);
