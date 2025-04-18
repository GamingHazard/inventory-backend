const mongoose = require("mongoose");

const CycleSchema = new mongoose.Schema(
  {
    juiceType: {
      type: String,
      required: true,
      enum: ["mango", "pineapple"],
    },
    ingredients: {
      type: Map,
      of: Number,
      required: true,
      validate: {
        validator: function (map) {
          return [...map.values()].every(
            (v) => typeof v === "number" && v >= 0
          );
        },
        message: "All ingredient values must be non-negative numbers",
      },
    },
    createdAt: {
      type: Date,
      default: Date.now,
      immutable: true,
    },
  }
  //   { timestamps: true }
);

const Cycle = mongoose.model("Cycle", CycleSchema);

module.exports = Cycle;

// // src/models/Cycle.js
// const mongoose = require("mongoose");

// const cycleSchema = new mongoose.Schema({

// });

// module.exports = mongoose.model("Cycle", cycleSchema);
