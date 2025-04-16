const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  profilePicture: { type: String, default: "" },

  firstName: {
    type: String,
    default: "",
  },
  secondName: {
    type: String,
    default: "",
  },
  email: { type: String, unique: true, default: "" },
  contact: { type: String, unique: true, default: "" },
  gender: { type: String, default: "" },
  password: { type: Date,required:true },

  verified: {
    type: Boolean,
    default: false,
  },
  verificationToken: String,
  resetCode: {
    type: String,
    default: "",
  },
  joindDate: { type: Date, default: Date.now },
});

const User = mongoose.model("User", userSchema);

module.exports = User;
