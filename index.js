const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const cloudinary = require("./Cloudinary");
const app = express();
const port = 3000;
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const path = require("path");

app.use(
  cors({
    origin: "*",
    methods: "GET,POST,PATCH,DELETE,PUT,OPTIONS",
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

mongoose
  .connect(process.env.DB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.log("Error Connecting to MongoDB");
  });

app.listen(port, () => {
  console.log("server is running on port 3000");
});

const User = require("./models/users");

const Inventory = require("./models/inventory");
const UsedStock = require("./models/usedStock");

// AUTHENTICATION

//  Endpoint for admin Login
app.post("/login", async (req, res) => {
  try {
    const { identifier, password } = req.body;
    // Find user by email or phone
    const user = await User.findOne({
      $or: [{ email: identifier }, { contact: identifier }],
    });

    if (!user) {
      return res.status(404).json({ message: "Wrong Email or Contact" });
    }

    // Check if the password matches
    const isPasswordValid = bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Wrong password" });
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user._id }, secretKey, {
      expiresIn: "1h",
    });

    // Respond with the token and user information
    res.status(200).json({
      token,
      id: user._id,
      user,
    });
  } catch (error) {
    console.error("Error during login", error);
    res.status(500).json({ message: "Login failed" });
  }
});

app.post("/user-email", async (req, res) => {
  const { email } = req.body;

  try {
    // Check if the user exists
    const user = await User.findOne({ email });
    if (user) return res.status(401).json({ message: "Email already exists" });

    function get6DigitRandom() {
      // Generates a random number between 100000 and 999999
      return Math.floor(100000 + Math.random() * 900000);
    }

    // Generate 5-digit alphanumeric code
    const verificationCode = get6DigitRandom();

    // Create a new admin user
    const newUser = new User({
      email: email.trim(),
      verificationToken: verificationCode,
    });
    // Send the verification email to the user
    await newUser.save();

    // Configure the nodemailer transporter
    const transporter = nodemailer.createTransport({
      service: "gmail", // Change to your email service provider
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Email options
    const mailOptions = {
      from: "micourses.com",
      to: email,
      subject: "Email Verification code",
      text: `Your email verification code is: ${verificationCode}`,
    };

    // Send the email
    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: "verification code sent to email" });
  } catch (error) {
    console.error("Error in /get-code:", error);
    res.status(500).json({ message: "An error occurred", error });
  }
});
// Endpoint to verify recovery email
app.patch("/verify-user-email", async (req, res) => {
  const { code } = req.body;
  try {
    const user = await User.find({ code });

    // If no user is found, return an error
    if (!user) {
      return res.status(404).json({ message: "user not found" });
    }

    user.verified = true;
    user.verificationToken = "";

    await user.save();
    res.status(200).json({
      message: "email verified",
      verified: user.verified,
      userId: user._id,
    });
  } catch (error) {
    console.error("Error verifying reset code:", error);
    res.status(500).json({ message: "Server error" });
  }
});
// UPDATING ENDPOINTS
app.patch("/register-user", async (req, res) => {
  const { firstName, secondName, gender, contact, password, id } = req.body;

  if (!mongoose.Types.ObjectId.isValid({ id })) {
    return res.status(400).json({ error: "Invalid user ID" });
  }

  const hashedPassword = bcrypt.hash(password, 10);

  try {
    const updateFields = {
      firstName,
      secondName,
      gender,
      password: hashedPassword,
      contact,
    };

    const updatedUser = await User.findByIdAndUpdate(id, updateFields, {
      new: true,
      runValidators: true,
    });

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    res
      .status(200)
      .json({ message: "User updated successfully", user: updatedUser });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({ error: error.message });
  }
});
app.post("/user-login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "Invalid email" });
    }

    if (user.password !== password) {
      return res.status(404).json({ message: "Invalid password" });
    }

    const token = jwt.sign({ userId: user._id }, secretKey);

    res.status(200).json({ token });
  } catch (error) {
    res.status(500).json({ message: "Login failed" });
  }
});

// FORGOT PASSWORD ENDPOINTS
// send random code to user
app.post("/get-code", async (req, res) => {
  const { email } = req.body;

  try {
    // Check if the user exists
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    function get6DigitRandom() {
      // Generates a random number between 100000 and 999999
      return Math.floor(100000 + Math.random() * 900000);
    }

    // Generate 5-digit alphanumeric code
    const resetCode = get6DigitRandom();
    // Save the reset code to the user's document in the database
    user.resetCode = resetCode;
    await user.save();

    // Configure the nodemailer transporter
    const transporter = nodemailer.createTransport({
      service: "gmail", // Change to your email service provider
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Email options
    const mailOptions = {
      from: "micourses.com",
      to: email,
      subject: "Password Reset Code",
      text: `Your password reset code is: ${resetCode}`,
    };

    // Send the email
    await transporter.sendMail(mailOptions);
    res.json({ message: "Reset code sent to email" });
  } catch (error) {
    console.error("Error in /get-code:", error);
    res.status(500).json({ message: "An error occurred", error });
  }
});

// verify the random  code
app.post("/verify-code", async (req, res) => {
  const { email, code } = req.body;

  try {
    // Query the database to find a user with the provided email and reset code
    const user = await Admin.findOne({ email, resetCode: code });

    // If no user is found, return an error
    if (!user) {
      return res.status(400).json({ message: "Invalid code or email" });
    }

    // Generate a temporary JWT token for password reset
    const resetToken = jwt.sign({ email }, process.env.JWT_SECRET, {
      expiresIn: "15m",
    });
    // Clear the reset code after successful verification to prevent reuse
    user.resetCode = "";
    await user.save();

    res.status(200).json({
      message: "Code verified",
      resetToken,
      user: {
        id: user._id,
      },
    });
  } catch (error) {
    console.error("Error verifying reset code:", error);
    res.status(500).json({ message: "Server error" });
  }
});

//  Endpoint for resetting password
app.post("/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find the user by the decoded email
    const user = await Admin.findOne({ email: decoded.email });

    if (!user) return res.status(404).json({ message: "User not found" });

    // Hash the new password and save it
    user.password = await bcrypt.hash(newPassword, 10);
    user.resetCode = ""; // Clear the reset code

    // Save the updated user
    await user.save();

    res.json({ message: "Password reset successful" });
  } catch (error) {
    console.error("Error resetting password:", error);
    res.status(400).json({ message: "Invalid or expired token" });
  }
});
// Endpoint to set a recovery email
app.post("/recovery-email", async (req, res) => {
  const { email, id } = req.body;

  try {
    // Check if the user exists
    const user = await Admin.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Generate 5-digit alphanumeric code
    const resetCode = crypto.randomBytes(3).toString("hex");

    // Save the reset code to the user's document in the database
    user.resetCode = resetCode;
    await user.save();

    // Configure the nodemailer transporter
    const transporter = nodemailer.createTransport({
      service: "gmail", // Change to your email service provider
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Email options
    const mailOptions = {
      from: "micourses.com",
      to: email,
      subject: "Password Reset Code",
      text: `Your verification code is: ${resetCode}`,
    };

    // Send the email
    await transporter.sendMail(mailOptions);
    res.json({ message: "Reset code sent to email" });
  } catch (error) {
    console.error("Error in /get-code:", error);
    res.status(500).json({ message: "An error occurred", error });
  }
});
// Endpoint to verify recovery email
app.patch("/verify-recover-email", async (req, res) => {
  const { email, code, id } = req.body;

  try {
    const user = await Admin.findById(id);

    // If no user is found, return an error
    if (!user) {
      return res.status(400).json({ message: "user not found" });
    }
    if (code === user.resetCode) {
      // Clear the reset code after successful verification to prevent reuse
      user.resetCode = "";
      user.recoverEmail = email;

      await user.save();
      res.status(200).json({
        message: "Code verified",
      });
    }
  } catch (error) {
    console.error("Error verifying reset code:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// UPDATING ENDPOINTS
app.patch("/update-admin", async (req, res) => {
  const { names, email, contact, recoveryEmail, id } = req.body;

  if (!mongoose.Types.ObjectId.isValid({ id })) {
    return res.status(400).json({ error: "Invalid user ID" });
  }

  try {
    const updateFields = { names, email, contact, recoveryEmail };

    const updatedUser = await Admin.findByIdAndUpdate(id, updateFields, {
      new: true,
      runValidators: true,
    });

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    res
      .status(200)
      .json({ message: "User updated successfully", admin: updatedUser });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({ error: error.message });
  }
});

// CHANGE admin PASSWORD
// Endpoint for User password
app.post("/admin-password/:UserId", async (req, res) => {
  try {
    const { password } = req.body;
    const adminid = req.params.UserId;

    // Find user by ID
    const user = await Admin.findById(adminid); // Assuming _id is used as the primary key

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (!password) {
      return res.status(400).json({ message: "Password is required" });
    }

    // Validate the password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Invalid password. Please check and try again.",
      });
    }

    // Respond with token and user info
    res.status(200).json({
      user: {
        id: user._id,
        fname: user.fname,
        sname: user.sname,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ message: "failed to get password" });
  }
});

// endpoint for updating user password
app.patch("/change-password/:id", async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const { id } = req.params;

    // Find user by ID
    const user = await Admin.findById(id); // Assuming _id is used as the primary key

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Validate the current password
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    );
    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Invalid current password. Please check and try again.",
      });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the user's password in the database
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({
      message: "Password changed successfully.",
    });
  } catch (error) {
    console.error("Error updating password:", error);
    res
      .status(500)
      .json({ message: "Password update failed due to a server error." });
  }
});

app.get("/profile/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ user });
  } catch (error) {
    res.status(500).json({ message: "Error while getting the profile" });
  }
});

// POST endpoint to create one or many inventory items
app.post("/inventory", async (req, res) => {
  try {
    const { inventories } = req.body;

    // Make sure we got an array
    if (!Array.isArray(inventories) || inventories.length === 0) {
      return res.status(400).json({ error: "No inventory items provided." });
    }

    // Transform each incoming object into your Inventory schema
    const docs = inventories.map((inv) => {
      const {
        category,
        item, // front‑end key is `item`
        quantity,
        scale,
        description = "",
        remainder = 0,
        remainderScale = "",
      } = inv;

      // Validate required fields
      if (!category || !item || !quantity || !scale) {
        throw new Error("Missing required fields in one of the items.");
      }

      return {
        category,
        itemName: item, // map to your schema’s `itemName`
        quantity,
        scale,
        description,
        remainder,
        remainderScale,
        postedDate: Date.now(),
      };
    });

    // Bulk‐insert into Mongo
    const saved = await Inventory.insertMany(docs);

    // Return all the saved docs
    res.status(201).json(saved);
  } catch (err) {
    console.error("Error posting inventory:", err);
    // If it was a validation error, send 400
    if (err.message.includes("Missing required")) {
      return res.status(400).json({ error: err.message });
    }
    // Otherwise, generic 500
    res.status(500).json({ error: "Server error while saving inventory." });
  }
});

// POST endpoint to create one or many used‑stock records
app.post("/usedstock", async (req, res) => {
  try {
    const { usedStock } = req.body;

    // 1️⃣ Validate that we have an array
    if (!Array.isArray(usedStock) || usedStock.length === 0) {
      return res.status(400).json({ error: "No used‑stock items provided." });
    }

    // 2️⃣ Map each incoming item to your Mongoose fields
    const docs = usedStock.map((u) => {
      const {
        category,
        item, // front‑end key
        quantity,
        scale,
        description = "",
      } = u;

      // 3️⃣ Validate per‑item required fields
      if (!category || !item || !quantity || !scale) {
        throw new Error(
          "Missing required fields in one of the used‑stock items."
        );
      }

      return {
        category,
        itemName: item, // map to schema
        quantity,
        scale,
        description,
        postedDate: Date.now(),
        // If you have auth middleware, you could add `user: req.user._id` here
      };
    });

    // 4️⃣ Bulk‑insert
    const saved = await UsedStock.insertMany(docs);

    // 5️⃣ Return the array of saved docs
    res.status(201).json(saved);
  } catch (err) {
    console.error("Error creating used‑stock:", err);
    if (err.message.includes("Missing required")) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: "Server error while creating used‑stock." });
  }
});

// GET endpoint to retrieve inventory items
app.get("/inventory", async (req, res) => {
  try {
    // Optionally filter by authenticated user if available
    const userId = req.user && req.user._id;
    const filter = userId ? { user: userId } : {};

    const inventories = await Inventory.find(filter);
    res.json(inventories);
  } catch (error) {
    console.error("Error fetching inventories:", error);
    res
      .status(500)
      .json({ error: "Server error while retrieving inventories." });
  }
});
// GET endpoint to retrieve used stock records
app.get("/usedstock", async (req, res) => {
  try {
    // Optionally filter by authenticated user if available
    const userId = req.user && req.user._id;
    const filter = userId ? { user: userId } : {};

    const usedStockList = await UsedStock.find(filter);
    res.json(usedStockList);
  } catch (error) {
    console.error("Error fetching used stock:", error);
    res
      .status(500)
      .json({ error: "Server error while retrieving used stock." });
  }
});

// GET /api/inventory/search?q=milk
app.get("/search", async (req, res) => {
  try {
    const query = req.query.q;
    const results = await Inventory.find({
      itemName: { $regex: query, $options: "i" },
    });
    res.status(200).json(results);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});
