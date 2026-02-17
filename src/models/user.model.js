import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { AvailableSocialLogins, UserLoginType } from "../constants.js";

const userSchema = new Schema(
  {
    name: {
      type: String,
      index: true,
    },
    mobileNumber: {
      type: String,
    },
    email: {
      type: String,
      required: [true, "Email Id is required"],
      unique: [true, "Email should be unique"],
      lowercase: true,
      trim: true,
      index: true,
    },
    username: {
      type: String,
      required: true,
      unique: [true, "Username should be unique"],
      lowercase: true,
      trim: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["admin", "student", "teacher"], // Define allowed user types
      default: "student",
      index: true, // Index role for better querying
    },

    status: {
      type: String,
      enum: ["active", "blocked"],
      default: "active",
    },

    subscription: {
      endpoint: { type: String },
      keys: {
        p256dh: { type: String },
        auth: { type: String },
      },
    },
    loginType: {
      type: String,
      enum: AvailableSocialLogins,
      default: UserLoginType.EMAIL_PASSWORD,
    },
    avatar: {
      public_id: { type: String },
      url: { type: String },
    },
    coverImage: {
      public_id: { type: String },
      url: { type: String },
    },
    about: {
      type: String,
    },
    verifyCode: {
      type: String,
    },
    verifyCodeExpiry: {
      type: Date,
    },
    emailVerified: {
      type: Boolean,
      default: false, // Ensures email is verified before login
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    resetToken: {
      type: String,
    },
    resetTokenExpiry: {
      type: Date,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    devices: [
      {
        refreshToken: {
          type: String,
        },
        accessToken: {
          type: String,
        },
        isFirst: {
          type: Boolean,
          default: false,
        },
        deviceId: {
          type: String,
        },
        ipAddress: {
          type: String,
        },
        loginStatus: {
          type: String,
          enum: ["success", "failed", "pending"],
          default: "pending",
        },
        attemptCount: {
          type: Number,
          default: 0,
        },
        attemptExpiresAt: {
          type: Date,
          default: () => Date.now() + 1000 * 24 * 60 * 60, // Expiry time is set to 1 day from now
        },
        lastLogin: {
          type: Date,
          default: Date.now(),
        },
        deviceType: {
          type: String,
        },
        isOnline: {
          type: Boolean,
          default: false,
        },
        expiresAt: {
          type: Date,
          default: Date.now() + 10 * 24 * 60 * 60 * 1000, // 30 days
        },
      },
    ],
    preferences: {
      notificationsEnabled: {
        type: Boolean,
        default: true,
      },
      darkMode: {
        type: Boolean,
        default: false,
      },
    },
  },
  {
    timestamps: true,
  },
);

// Pre-save hook to hash password
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare password method
userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

// JWT generation methods
userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
      name: this.name,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    },
  );
};

userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    },
  );
};

userSchema.methods.generateResetToken = function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.RESET_TOKEN_EXPIRY,
    },
  );
};

// Indexes for better performance on frequently queried fields
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ role: 1 });

export const User = mongoose.model("User", userSchema);
