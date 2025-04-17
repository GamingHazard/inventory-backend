const mongoose = require("mongoose");

const InventorySchema = new mongoose.Schema(
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
    remainder: {
      type: Number,
      default: 0,
    },
    remainderScale: {
      type: String,
      default: ""
    },
    description: {
      type: String,
      default: ""
    },
    // Custom field to record the posting date of the inventory entry
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
  { timestamps: true } // This will automatically add createdAt and updatedAt fields as well.
);

const Inventory = mongoose.model("Inventory", InventorySchema);

module.exports = Inventory;
