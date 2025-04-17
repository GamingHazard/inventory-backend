const mongoose = require("mongoose");

const UsedStockSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: true,
      index: true,
    },
    itemName: {
      type: String,
      required: true,
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    scale: {
      type: String,
      required: true,
    },
    description: {
      type: String,
     default:""
    },
    // Field to record the posting date explicitly; createdAt will also be managed by timestamps
    postedDate: {
      type: Date,
      default: Date.now,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
       
      index: true,
    },
  },
  { timestamps: true }
);

const UsedStock = mongoose.model("UsedStock", UsedStockSchema);

module.exports = UsedStock;
