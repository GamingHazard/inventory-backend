const mongoose = require("mongoose");

const InventorySchema = new mongoose.Schema(
  {
    itemName: {
      type: String,
      required: true,
      index: true,

    },
    quantity: {
      type: String,
      required: true,
      index: true,
    },
    mls: {
      type: String,
      required: true,
    },
    machineType: {
      type: String,
      required: true,
    },
    coverImage: {
      url: { type: String, required: true, default: "" },
      public_Id: { type: String, required: true, default: "" },
    },
    
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

const Inventory = mongoose.model("Inventory", InventorySchema);

module.exports = Inventory;
