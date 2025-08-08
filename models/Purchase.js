const mongoose = require("mongoose");
const { Schema } = mongoose;

const Purchase = new Schema({
   courseId: {
      type: Schema.Types.ObjectId,
      ref: "course",
   },
   userId: {
      type: Schema.Types.ObjectId,
      ref: "user",
   },
});

const PurchaseModel = mongoose.model("purchase", Purchase);
module.exports = PurchaseModel;
