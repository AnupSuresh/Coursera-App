const mongoose = require("mongoose");
const { Schema } = mongoose;
const bcrypt = require("bcrypt");

const User = new Schema(
   {
      firstName: {
         type: String,
         required: true,
         trim: true,
      },
      lastName: {
         type: String,
         required: true,
         trim: true,
      },
      email: {
         type: String,
         unique: true,
         required: true,
         lowercase: true,
         trim: true,
      },
      password: {
         type: String,
         required: true,
         select: false,
      },
      role: {
         type: String,
         enum: ["user", "admin"],
         default: "user",
      },
   },
   {
      timestamps: true,
   }
);

User.pre("save", async function (next) {
   if (!this.isModified("password")) {
      return next();
   }
   try {
      const saltRounds = 10;
      this.password = await bcrypt.hash(this.password, saltRounds);
      next();
   } catch (error) {
      next(error);
   }
});

User.methods.verifyPassword = async function (candidatePassword) {
   return await bcrypt.compare(candidatePassword, this.password);
};

const UserModel = mongoose.model("user", User);
module.exports = UserModel;
