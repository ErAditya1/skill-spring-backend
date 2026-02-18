import { asyncHandler } from "../utils/AsyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import cron from "node-cron";
import {
  uploadOnCloudinary,
  deleteCloudinaryFile,
} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import Jwt from "jsonwebtoken";
import { Follow } from "../models/follow.model.js";
import mongoose from "mongoose";
import {
  sendResetEmail,
  sendVerificationEmail,
  sendWelcomeBackEmail,
  sendWelcomeEmail,
} from "../helpers/mailer.js";
import { UUID } from "mongodb";
import { CodeExpiryTime } from "../constants.js";

export const generateAccessAndRefereshTokens = async (userId, req) => {
  try {
    console.log("Generating access and refresh tokens");
    const deviceId = req.headers["x-unique-id"] || req.query.deviceId;

    // Find the user by ID
    const user = await User.findById(userId);

    // Generate access and refresh tokens
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    console.log("access token generated");

    // Find the device in the user's devices array by deviceId
    const deviceIndex = user.devices.findIndex(
      (device) =>
        device.deviceId === deviceId || device.accessToken === req.accessToken,
    );

    const isFirst = user.devices.length <= 1 ? true : false;
    if (deviceIndex !== -1) {
      // If device exists, update the tokens and other details based on the device status
      const device = user.devices[deviceIndex];
      device.deviceId = deviceId;
      device.loginStatus = "success";
      device.attemptCount = 1;
      device.accessToken = accessToken;
      device.refreshToken = refreshToken;
      device.expiresAt = Date.now() + 10 * 24 * 60 * 60 * 1000; // 10 days from last login
      device.isFirst = isFirst;
    } else {
      // If device doesn't exist, add a new device entry
      user.devices.push({
        deviceId: deviceId,
        loginStatus: "success",
        attemptCount: 1,
        accessToken: accessToken,
        refreshToken: refreshToken,
        isFirst: isFirst,
      });
    }

    // Save the updated user document without validation
    await user.save({ validateBeforeSave: false });

    // Return the generated tokens
    return { accessToken, refreshToken };
  } catch (error) {
    console.log(error);
    // Handle errors
    throw new ApiError(
      500,
      "Something went wrong while generating access and refresh tokens",
    );
  }
};

export const generateUsername = async (proposedName) => {
  proposedName = proposedName;

  return User.findOne({ username: proposedName })
    .then(function (account) {
      if (account != null) {
        proposedName += Math.floor(Math.random() * 100 + 1);
        generateUsername(proposedName);
      }
      return proposedName;
    })
    .catch(function (err) {
      throw err;
    });
};

// Function to remove expired devices from the devices array
async function removeExpiredDevices() {
  console.log("Cleanup task executed.");
  try {
    const currentTime = new Date();
    // Find users whose devices have expired
    const users = await User.find({
      devices: {
        $elemMatch: {
          expiresAt: { $lt: currentTime }, // Looking for expired devices inside the array
        },
      },
    });

    console.log(users);

    for (const user of users) {
      // Filter out the expired devices from the devices array
      user.devices = user.devices.filter(
        (device) => new Date(device.expiresAt) > currentTime,
      );

      // Save the updated user document after removing expired devices
      await user.save();
    }

    // console.log('Expired devices cleaned up successfully.');
  } catch (error) {
    consple.log(error);
  }
}

// Schedule the cleanup function to run daily at midnight (00:00)
cron.schedule("* * * * *", async () => {
  // await removeExpiredDevices();
});

const getUserName = asyncHandler(async (req, res) => {
  const { username } = req.query;

  if (!username || username.trim() === "") {
    throw new ApiError(400, "Username is required");
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    throw new ApiError(400, "Username must not contain special characters");
  }

  const userName = await generateUsername(username);
  if (username !== userName) {
    return res
      .status(201)
      .json(
        new ApiResponse(200, { username: userName }, "Username is unavailable"),
      );
  } else {
    return res
      .status(201)
      .json(new ApiResponse(200, "", "Username is available"));
  }
});

const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, username, role } = req.body;
  console.log({ name, email, password, username });
  if (
    [name, email, password, username].some((field) => {
      field?.trim() === "";
    })
  ) {
    throw new ApiError(400, "All fields are required");
  }
  const existingUser = await User.findOne({
    $or: [{ username }, { email }],
    emailVerified: true,
  });

  if (existingUser) {
    throw new ApiError(409, "User already exists");
  }
  const existingVerifiedUserByUsername = await User.findOne({
    username,
  });
  if (existingVerifiedUserByUsername) {
    throw new ApiError(409, "Username already taken");
  }
  const existingUserByEmail = await User.findOne({
    email,
  });

  const verifyCode = Math.floor(100000 + Math.random() * 900000).toString();

  if (existingUserByEmail) {
    if (existingUserByEmail.emailVerified) {
      return res
        .status(201)
        .json(
          new ApiResponse(
            200,
            existingUserByEmail,
            "User Allready registered with this email",
          ),
        );
    } else {
      existingUserByEmail.verifyCode = verifyCode;
      existingUserByEmail.verifyCodeExpiry = CodeExpiryTime;
      const user = await existingUserByEmail.save();
      const createdUser = await User.findById(user._id).select(
        "-password -refreshToken",
      );
      const emailResponse = await sendVerificationEmail({
        email,
        username: createdUser.username,
        verifyCode,
      });
      if (!emailResponse) {
        console.log(emailResponse);
      }
      return res
        .status(201)
        .json(
          new ApiResponse(
            200,
            createdUser,
            "User already registered. Please verify your account.",
          ),
        );
    }
  } else {
    const user = await User.create({
      name,
      email,
      username,
      password,
      role,
      verifyCode: verifyCode,
      verifyCodeExpiry: CodeExpiryTime,
      emailVerified:true
    });
    const createdUser = await User.findById(user._id).select(
      "-password -refreshToken",
    );

    if (!createdUser) {
      throw new ApiError(
        500,
        "Something went wrong while registering the user",
      );
    }
    const emailResponse =  sendVerificationEmail({
      email,
      username: createdUser.username,
      verifyCode,
    });
    if (!emailResponse) {
      console.log(emailResponse);
      createdUser.deleteOne();
    }
    return res
      .status(201)
      .json(
        new ApiResponse(
          200,
          createdUser,
          "User registerd successfully. Please verify your account.",
        ),
      );
  }
});

const registerWithSocial = asyncHandler(async (req, res) => {
  const { name, email, username, avatar } = req.body;
  console.log({ name, email, password, username });
  if (
    [name, email].some((field) => {
      field?.trim() === "";
    })
  ) {
    throw new ApiError(400, "All fields are required");
  }
  const existingUser = await User.findOne({
    email,
    emailVerified: true,
  });

  if (existingUser) {
    const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(
      existingUser._id,
      req,
    );
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { user: existingUser, accessToken, refreshToken },
          "User logged in successfully",
        ),
      );
  }
  const existingVerifiedUserByUsername = await User.findOne({
    username,
  });
  let uName;
  if (existingVerifiedUserByUsername) {
    uName = generateUsername(username);
  }

  const user = await User.create({
    name,
    username: uName,
    email,
    avatar: {
      url: avatar,
    },
    emailVerified: true,
    password: UUID().toString(),
  });

  const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(
    user._id,
    req,
  );
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        "User logged in successfully",
      ),
    );
});

const handleSocialLogin = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user?._id);

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  console.log("generating access token");

  const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(
    user._id,
    req,
  );

  const options = {
    httpOnly: true, // Cannot be accessed by JavaScript
    secure: true,
    maxAge: 3600 * 1000,
    sameSite: "None",
  };

  return res
    .status(301)
    .cookie("accessToken", accessToken, options) // set the access token in the cookie
    .cookie("refreshToken", refreshToken, options) // set the refresh token in the cookie
    .redirect(
      // redirect user to the frontend with access and refresh token in case user is not using cookies
      `${process.env.CLIENT_URL}/?accessToken=${accessToken}&refreshToken=${refreshToken}`,
    );
});

const resendCode = asyncHandler(async (req, res) => {
  const { username } = req.body;
  console.log(username);
  const user = await User.findOne({ username });
  if (!user) {
    throw new ApiError(404, "User does not exist");
  }
  if (user.emailVerified) {
    throw new ApiError(409, "User is already verified");
  }
  const verifyCode = Math.floor(100000 + Math.random() * 900000).toString();
  user.verifyCode = verifyCode;
  user.verifyCodeExpiry = CodeExpiryTime;
  await user.save();
  const emailResponse = await sendVerificationEmail({
    email: user.email,
    username: user.username,
    verifyCode,
  });
  if (!emailResponse) {
    console.log(emailResponse);
  }
  return res
    .status(201)
    .json(new ApiResponse(201, "", "Verification code sent to your email "));
});

const verifyCode = asyncHandler(async (req, res) => {
  const { username, code } = req.body;

  if (!username || !code) {
    throw new ApiError(400, "Username and verification code are required");
  }

  const user = await User.findOne({ username });

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  if (user.emailVerified) {
    throw new ApiError(409, "User is already verified");
  }

  if (user.verifyCode !== code) {
    throw new ApiError(400, "Invalid verification code");
  }

  if (user.verifyCodeExpiry < Date.now()) {
    throw new ApiError(403, "Verification code has expired");
  }

  user.verifyCode = null;
  user.verifyCodeExpiry = null;
  user.emailVerified = true;

  await user.save();

  const verifiedUser = await User.findById(user._id).select(
    "-password -refreshToken",
  );

  await sendWelcomeEmail({
    email: user.email,
    username: user.username,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, verifiedUser, "User verified successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  const { identifier, password, deviceType } = req.body;

  // Validation - check that identifier and password are provided
  if (!identifier || !password) {
    throw new ApiError(400, "All fields are required");
  }

  // Find the user based on username or email
  const user = await User.findOne({
    $or: [{ username: identifier }, { email: identifier }],
  });

  // If the user does not exist, throw an error
  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  // If the user is not verified, throw an error
  if (!user.emailVerified) {
    throw new ApiError(401, "User is not verified");
  }

  // Find the device in the user's devices array
  const deviceId = req.headers["x-unique-id"] || req.query.deviceId;
  const deviceIndex = user.devices.findIndex(
    (device) => device.deviceId === deviceId,
  );
  let device = deviceIndex !== -1 ? user.devices[deviceIndex] : null;

  if (device && device.attemptExpiresAt <= Date.now()) {
    user.devices[deviceIndex].attemptCount = 0;
    await user.save();
  }
  if (!device) {
    // If device does not exist, create a new device record
    user.devices.push({
      deviceType,
      deviceId,
      loginStatus: "pending",
      attemptCount: 0,
      attemptExpiresAt: null,
    });

    // Save the user document after updating device status
    await user.save({ validateBeforeSave: false });

    device = user.devices[user.devices.length - 1];
  }

  // If the device exists, check for failed login attempts
  if (
    device &&
    device.attemptCount >= 5 &&
    device.attemptExpiresAt > Date.now()
  ) {
    // User has attempted 5 failed logins within the last 24 hours
    throw new ApiError(
      403,
      "Account is temporarily blocked. Please try again after 24 hours.",
    );
  }

  // Check if the password is valid
  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    // If invalid password, increase the failed login attempts and set the expire time if not already set
    if (device) {
      device.attemptCount += 1;
      if (device.attemptCount === 1) {
        device.attemptExpiresAt = Date.now() + 1000 * 24 * 60 * 60; // 24 hours from now
      }
    } else {
      // If device does not exist, create a new device record with failed attempt count
      user.devices.push({
        deviceId,
        loginStatus: "failed",
        attemptCount: 1,
        attemptExpiresAt: Date.now() + 1000 * 24 * 60 * 60, // 24 hours from now
      });
    }

    // Save the user document after updating device status
    await user.save({ validateBeforeSave: false });

    throw new ApiError(401, "Invalid password");
  }

  // Generate access and refresh tokens
  const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(
    user._id,
    req,
  );

  // Save the updated user document
  await user.save({ validateBeforeSave: false });

  // Exclude password and devices from the response
  const loggedInUser = await User.findById(user._id).select(
    "-password -devices",
  );

  // Set the cookie options
  const cookieOptions = {
    httpOnly: true, // Cannot be accessed by JavaScript
    secure: true,
    maxAge: 3600 * 1000,
    sameSite: "None",
  };

  sendWelcomeBackEmail({
    email: user.email,
    username: user.username,
  });

  // Set both accessToken and refreshToken cookies in the response
  res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken: accessToken,
          refreshToken: refreshToken,
        },
        "User logged in successfully",
      ),
    );
});

const requestResetPassword = asyncHandler(async (req, res) => {
  // get user details from frontend
  // validation - not empty
  // get user
  // check password
  // generate refresh token
  // send cookie

  const { identifier } = req.body;
  if (!identifier && !password) {
    throw new ApiError(400, "Username or Email are required");
  }
  const user = await User.findOne({
    $or: [{ username: identifier }, { email: identifier }],
  });
  if (!user) {
    throw new ApiError(404, "Invalid username or email");
  }
  if (!user.emailVerified) {
    throw new ApiError(401, "User is not verified");
  }

  const resetToken = await user.generateResetToken();
  user.resetToken = resetToken;
  user.resetTokenExpiry = Date.now() + 1000 * 60 * 60; //  1 hour
  await user.save();

  const emailResponse = await sendResetEmail({
    email: user.email,
    username: user.username,
    resetToken,
  });
  if (!emailResponse) {
    console.log(emailResponse);
    throw new ApiError(`Failed to send reset email`);
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        "",
        `We sent an email to ${user.email} with a link to get back into your account.`,
      ),
    );
});

const resetPassword = asyncHandler(async (req, res) => {
  const { password, password1, resetToken } = req.body;
  const user = await User.findOne({ resetToken });

  if (!user) {
    throw new ApiError(404, "Invalid reset token");
  }
  if (user.resetTokenExpiry < Date.now()) {
    throw new ApiError(401, "Reset token has expired");
  }
  if (password !== password1) {
    throw new ApiError(400, "Passwords do not match");
  }

  user.password = password;
  user.resetToken = undefined;
  user.resetTokenExpiry = undefined;
  await user.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user,
        "Your password has been reset successfully. You can now log in with your new password.",
      ),
    );
});

const logOutUser = asyncHandler(async (req, res) => {
  const deviceId = req.headers["x-unique-id"] || req.query.deviceId;

  if (!deviceId) {
    throw new ApiError(400, "Device ID is required for logout");
  }

  // Find the user by the provided user ID
  const user = await User.findById(req.user._id);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Find the device entry in the user's devices array
  const deviceIndex = user.devices.findIndex(
    (device) => device.deviceId === deviceId,
  );

  if (deviceIndex === -1) {
    throw new ApiError(404, "Device not found");
  }
  // Remove the device from the user's devices array
  user.devices.splice(deviceIndex, 1);

  // Save the updated user object (without validation to avoid hooks)
  await user.save({ validateBeforeSave: false });

  const options = {
    httpOnly: true, // Cannot be accessed by JavaScript
    secure: true,
    maxAge: 3600 * 1000,
    sameSite: "None",
  };
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find();
  return res
    .status(200)
    .json(new ApiResponse(200, users, "All users is fetched successfully"));
});

 function getCookieValue(cookieString, name) {
  
  if(!cookieString) return null;
  return cookieString
    .split("; ")
    .find((row) => row.startsWith(name + "="))
    ?.split("=")[1]
}

const refreshAccessToken = asyncHandler(async (req, res) => {

  const cookieString = req.headers["cookie"];

  console.log(cookieString);

  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken||
    getCookieValue(cookieString, "refreshToken");
  const deviceId = req.headers["x-unique-id"] ||getCookieValue(cookieString, "uniqueId"); // Device ID from headers

  console.log(incomingRefreshToken);
  console.log("Request received for refresh token");

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request. No refresh token provided.");
  }

  if (!deviceId) {
    throw new ApiError(400, "No unique device ID provided.");
  }

  try {
    // Verify the refresh token
    const decodedToken = Jwt.verify(
      incomingRefreshToken,
      process.env.JWT_SECRET,
    );
    const user = await User.findById(decodedToken._id).select("-password");

    if (!user) {
      throw new ApiError(401, "User not found for the provided refresh token.");
    }

    // Find the device associated with this refresh token
    const device = user.devices.find((d) => d.deviceId === deviceId);

    if (!device) {
      throw new ApiError(401, "Device not found. Invalid device ID.");
    }

    // Check if the incoming refresh token matches the stored one for the device
    if (incomingRefreshToken !== device.refreshToken) {
      throw new ApiError(
        401,
        "Refresh token is expired or incorrect for this device.",
      );
    }

    // Generate new access and refresh tokens
    const options = {
      httpOnly: true, // Cannot be accessed by JavaScript
      secure: true,
      maxAge: 3600 * 1000,
      sameSite: "None",
    };

    const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(
      user._id,
      req,
    );

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            user: user,
            accessToken,
            refreshToken,
            // device: device, // Include device info in the response
          },
          "Access token and refresh token refreshed successfully",
        ),
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token.");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id);
  const isPasswordCorrect = user.isPasswordCorrect(oldPassword);
  if (!isPasswordCorrect) {
    throw new ApiError(401, "Invalid old password");
  }
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  req.user.devices = [];
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { user: req.user, device: req.device },
        "Current user fetched successfully",
      ),
    );
});

const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params._id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, user, "User fetched successfully"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { name, mobileNumber, username, about, email } = req.body;
  if (
    [name, username, email].some((field) => {
      field?.trim() === "";
    })
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const user = await User.findOne({ email }).select("-password -refreshToken");
  if (user && user._id.toString() !== req.user._id.toString()) {
    throw new ApiError(400, "Email already exists");
  }
  user.name = name;
  user.mobileNumber = mobileNumber;
  user.username = username;
  user.about = about;
  user.email = email;
  await user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;
  console.log(req.file);

  if (!avatarLocalPath) {
    throw new ApiError(404, "Avatar file is missing");
  }
  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar) {
    throw new ApiError(404, "error while uploading avatar");
  }
  if (req.user?.avatar) {
    await deleteCloudinaryFile(req.user.avatar.public_id);
  }

  await User.findByIdAndUpdate(req.user?._id, {
    $set: {
      avatar: {
        public_id: avatar.public_id,
        url: avatar.secure_url,
      },
    },
  }).select("-password ");
  const user = await User.findById(req.user?._id).select("-password ");
  console.log(user);
  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar updated successfully"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
    throw new ApiError(404, "coverImage file is missing");
  }
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!coverImage.url) {
    throw new ApiError(500, "error while uploading coverImage");
  }

  if (req.user?.coverImage) {
    await deleteCloudinaryFile(req.user.coverImage.public_id);
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        coverImage: {
          public_id: coverImage.public_id,
          url: coverImage.secure_url,
        },
      },
    },
    { new: true },
  ).select("-password ");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "coverImage updated successfully"));
});

const getProfile = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  if (!_id) {
    throw new ApiError(400, "_id is missing");
  }

  try {
    const profile = await User.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(_id),
        },
      },
      // collect fallowings
      {
        $lookup: {
          from: "follows",
          localField: "_id",
          foreignField: "follower",
          as: "followings",
          pipeline: [
            // lookup for user details
            {
              $lookup: {
                from: "users",
                localField: "following",
                foreignField: "_id",
                as: "author",
                pipeline: [
                  {
                    $project: {
                      _id: 1,
                      username: 1,
                      name: 1,
                      avatar: 1,
                      isIamFollowing: 1,
                      isFollowingToMe: 1,
                      followings: 1,
                      followers: 1,
                    },
                  },
                ],
              },
            },
            {
              $lookup: {
                from: "follows",
                localField: "following",
                foreignField: "following",
                as: "followers",
                pipeline: [
                  {
                    $project: {
                      following: 1,
                      follower: 1,
                    },
                  },
                ],
              },
            },
            {
              $lookup: {
                from: "follows",
                localField: "following",
                foreignField: "follower",
                as: "followings",
                pipeline: [
                  {
                    $project: {
                      following: 1,
                      follower: 1,
                    },
                  },
                ],
              },
            },
            {
              $addFields: {
                author: {
                  $arrayElemAt: ["$author", 0],
                },
                isFollowingToMe: {
                  $cond: {
                    if: {
                      $in: [req.user._id, "$followings.following"],
                    },
                    then: true,
                    else: false,
                  },
                },
                isIamFollowing: {
                  $cond: {
                    if: {
                      $in: [req.user._id, "$followers.follower"],
                    },
                    then: true,
                    else: false,
                  },
                },
                isSelf: {
                  $cond: {
                    if: {
                      $in: [req.user._id, "$author._id"],
                    },
                    then: true,
                    else: false,
                  },
                },
              },
            },
            {
              $project: {
                _id: 1,
                author: 1,
                followings: 1,
                followers: 1,
                isIamFollowing: 1,
                isFollowingToMe: 1,
                isSelf: 1,
              },
            },
          ],
        },
      },
      // collect fallowers
      {
        $lookup: {
          from: "follows",
          localField: "_id",
          foreignField: "following",
          as: "followers",
          pipeline: [
            {
              $lookup: {
                from: "users",
                localField: "follower",
                foreignField: "_id",
                as: "author",
                pipeline: [
                  {
                    $project: {
                      _id: 1,
                      username: 1,
                      name: 1,
                      avatar: 1,
                    },
                  },
                ],
              },
            },
            {
              $lookup: {
                from: "follows",
                localField: "follower",
                foreignField: "following",
                as: "followers",
                pipeline: [
                  {
                    $project: {
                      following: 1,
                      follower: 1,
                    },
                  },
                ],
              },
            },
            {
              $lookup: {
                from: "follows",
                localField: "follower",
                foreignField: "follower",
                as: "followings",
                pipeline: [
                  {
                    $project: {
                      following: 1,
                      follower: 1,
                    },
                  },
                ],
              },
            },
            {
              $addFields: {
                author: {
                  $arrayElemAt: ["$author", 0],
                },
                isFollowingToMe: {
                  $cond: {
                    if: {
                      $in: [req.user._id, "$followings.following"],
                    },
                    then: true,
                    else: false,
                  },
                },
                isIamFollowing: {
                  $cond: {
                    if: {
                      $in: [req.user._id, "$followers.follower"],
                    },
                    then: true,
                    else: false,
                  },
                },
                isSelf: {
                  $cond: {
                    if: {
                      $in: [req.user._id, "$author._id"],
                    },
                    then: true,
                    else: false,
                  },
                },
              },
            },
            {
              $project: {
                _id: 1,
                author: 1,
                isFollowingToMe: 1,
                isIamFollowing: 1,
                followings: 1,
                followers: 1,
                isSelf: 1,
              },
            },
          ],
        },
      },
      // collecting all posts
      {
        $lookup: {
          from: "posts",
          localField: "_id",
          foreignField: "author",
          as: "blogposts",
          pipeline: [
            {
              $project: {
                _id: 1,
              },
            },
          ],
        },
      },

      // collecting all watch history
      {
        $lookup: {
          from: "views",
          localField: "_id",
          foreignField: "user_Id",
          as: "watchedVideos",
          pipeline: [
            {
              $project: {
                video_Id: 1,
              },
            },
          ],
        },
      },
      {
        $lookup: {
          from: "views",
          localField: "_id",
          foreignField: "user_Id",
          as: "watchedCourses",
          pipeline: [
            {
              $project: {
                course_Id: 1,
              },
            },
          ],
        },
      },
      {
        $lookup: {
          from: "views",
          localField: "_id",
          foreignField: "user_Id",
          as: "watchedPosts",
          pipeline: [
            {
              $project: {
                post_Id: 1,
              },
            },
          ],
        },
      },

      // collecting all liked history
      {
        $lookup: {
          from: "likes",
          localField: "_id",
          foreignField: "user_Id",
          as: "likedVideos",
          pipeline: [
            {
              $project: {
                video_Id: 1,
              },
            },
          ],
        },
      },
      {
        $lookup: {
          from: "likes",
          localField: "_id",
          foreignField: "user_Id",
          as: "likedCourses",
          pipeline: [
            {
              $project: {
                course_Id: 1,
              },
            },
          ],
        },
      },
      {
        $lookup: {
          from: "likes",
          localField: "_id",
          foreignField: "user_Id",
          as: "likedPosts",
          pipeline: [
            {
              $project: {
                post_Id: 1,
              },
            },
          ],
        },
      },

      // collecting all saved history
      {
        $lookup: {
          from: "saves",
          localField: "_id",
          foreignField: "user_Id",
          as: "savedVideos",
          pipeline: [
            {
              $project: {
                video_Id: 1,
              },
            },
          ],
        },
      },
      {
        $lookup: {
          from: "saves",
          localField: "_id",
          foreignField: "user_Id",
          as: "savedCourses",
          pipeline: [
            {
              $project: {
                course_Id: 1,
              },
            },
          ],
        },
      },
      {
        $lookup: {
          from: "saves",
          localField: "_id",
          foreignField: "user_Id",
          as: "savedPosts",
          pipeline: [
            {
              $project: {
                post_Id: 1,
              },
            },
          ],
        },
      },

      // collecting all likes
      {
        $lookup: {
          from: "likes",
          localField: "_id",
          foreignField: "user",
          as: "likes",
          pipeline: [
            {
              $project: {
                _id: 1,
              },
            },
          ],
        },
      },
      // collecting all comments
      {
        $lookup: {
          from: "comments",
          localField: "_id",
          foreignField: "user",
          as: "comments",
          pipeline: [
            {
              $project: {
                _id: 1,
              },
            },
          ],
        },
      },

      {
        $addFields: {
          followersCount: {
            $size: "$followers",
          },
          followingsCount: {
            $size: "$followings",
          },
          isFollowing: {
            $cond: {
              if: { $in: [req.user?._id, "$followers.follower"] },
              then: true,
              else: false,
            },
          },
          postCount: {
            $size: "$blogposts",
          },
          isAuthor: {
            $cond: {
              if: { $eq: ["$_id", req.user?._id] },
              then: true,
              else: false,
            },
          },
        },
      },
      {
        $project: {
          username: 1,
          name: 1,
          email: 1,
          avatar: 1,
          about: 1,
          coverImage: 1,
          blogposts: 1,
          followers: 1,
          followings: 1,
          isFollowing: 1,
          isAuthor: 1,
          followersCount: 1,
          followingsCount: 1,
          postCount: 1,
          watchedVideos: 1,
          watchedCourses: 1,
          watchedPosts: 1,
          likedVideos: 1,
          likedCourses: 1,
          likedPosts: 1,
          savedVideos: 1,
          savedCourses: 1,
          savedPosts: 1,
          likes: 1,
          comments: 1,
        },
      },
    ]);
    if (!profile.length) {
      throw new ApiError(404, "Profile does not exist");
    }
    return res
      .status(200)
      .json(new ApiResponse(200, profile[0], "User fetched successfully"));
  } catch (error) {
    throw new ApiError(500, error.message);
  }
});

const getUserProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;
  if (!username) {
    throw new ApiError(400, "Username is missing");
  }
  const { _id } = await User.findOne({ username }).exec();
  if (!_id) {
    throw new ApiError(400, "_id is missing");
  }
  const user_id = req.user._id;

  try {
    const profile = await User.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(_id),
        },
      },

      // collect fallowings
      {
        $lookup: {
          from: "follows",
          localField: "_id",
          foreignField: "follower",
          as: "followings",
          pipeline: [
            // lookup for user details
            {
              $lookup: {
                from: "users",
                localField: "following",
                foreignField: "_id",
                as: "author",
                pipeline: [
                  {
                    $project: {
                      _id: 1,
                      username: 1,
                      name: 1,
                      avatar: 1,
                      isIamFollowing: 1,
                      isFollowingToMe: 1,
                      followings: 1,
                      followers: 1,
                    },
                  },
                ],
              },
            },
            {
              $lookup: {
                from: "follows",
                localField: "following",
                foreignField: "following",
                as: "followers",
                pipeline: [
                  {
                    $project: {
                      following: 1,
                      follower: 1,
                    },
                  },
                ],
              },
            },
            {
              $lookup: {
                from: "follows",
                localField: "following",
                foreignField: "follower",
                as: "followings",
                pipeline: [
                  {
                    $project: {
                      following: 1,
                      follower: 1,
                    },
                  },
                ],
              },
            },
            {
              $addFields: {
                author: {
                  $arrayElemAt: ["$author", 0],
                },
                isFollowingToMe: {
                  $cond: {
                    if: {
                      $in: [req.user._id, "$followings.following"],
                    },
                    then: true,
                    else: false,
                  },
                },
                isIamFollowing: {
                  $cond: {
                    if: {
                      $in: [req.user._id, "$followers.follower"],
                    },
                    then: true,
                    else: false,
                  },
                },
                isSelf: {
                  $cond: {
                    if: {
                      $in: [req.user._id, "$author._id"],
                    },
                    then: true,
                    else: false,
                  },
                },
              },
            },
            {
              $project: {
                _id: 1,
                author: 1,
                followings: 1,
                followers: 1,
                isIamFollowing: 1,
                isFollowingToMe: 1,
                isSelf: 1,
              },
            },
          ],
        },
      },
      // collect fallowers
      {
        $lookup: {
          from: "follows",
          localField: "_id",
          foreignField: "following",
          as: "followers",
          pipeline: [
            {
              $lookup: {
                from: "users",
                localField: "follower",
                foreignField: "_id",
                as: "author",
                pipeline: [
                  {
                    $project: {
                      _id: 1,
                      username: 1,
                      name: 1,
                      avatar: 1,
                    },
                  },
                ],
              },
            },
            {
              $lookup: {
                from: "follows",
                localField: "follower",
                foreignField: "following",
                as: "followers",
                pipeline: [
                  {
                    $project: {
                      following: 1,
                      follower: 1,
                    },
                  },
                ],
              },
            },
            {
              $lookup: {
                from: "follows",
                localField: "follower",
                foreignField: "follower",
                as: "followings",
                pipeline: [
                  {
                    $project: {
                      following: 1,
                      follower: 1,
                    },
                  },
                ],
              },
            },
            {
              $addFields: {
                author: {
                  $arrayElemAt: ["$author", 0],
                },
                isFollowingToMe: {
                  $cond: {
                    if: {
                      $in: [req.user._id, "$followings.following"],
                    },
                    then: true,
                    else: false,
                  },
                },
                isIamFollowing: {
                  $cond: {
                    if: {
                      $in: [req.user._id, "$followers.follower"],
                    },
                    then: true,
                    else: false,
                  },
                },
                isSelf: {
                  $cond: {
                    if: {
                      $in: [req.user._id, "$author._id"],
                    },
                    then: true,
                    else: false,
                  },
                },
              },
            },
            {
              $project: {
                _id: 1,
                author: 1,
                isFollowingToMe: 1,
                isIamFollowing: 1,
                followings: 1,
                followers: 1,
                isSelf: 1,
              },
            },
          ],
        },
      },

      // collect posts
      {
        $lookup: {
          from: "posts",
          localField: "_id",
          foreignField: "author",
          as: "posts",
          pipeline: [
            {
              $project: {
                _id: 1,
              },
            },
          ],
        },
      },
      // collect videos
      {
        $lookup: {
          from: "videos",
          localField: "_id",
          foreignField: "author",
          as: "videos",
          pipeline: [
            {
              $match: {
                $and: [{ isFree: true }, { isPublished: true }],
              },
            },
            {
              $project: {
                _id: 1,
              },
            },
          ],
        },
      },
      // Collect courses
      {
        $lookup: {
          from: "courses",
          localField: "_id",
          foreignField: "author",
          as: "courses",
          pipeline: [
            {
              $match: {
                isPublished: true,
              },
            },
            {
              $project: {
                _id: 1,
              },
            },
          ],
        },
      },

      {
        $addFields: {
          followersCount: {
            $size: "$followers",
          },
          followingsCount: {
            $size: "$followings",
          },
          isFollowing: {
            $cond: {
              if: { $in: [req.user?._id, "$followers.author._id"] },
              then: true,
              else: false,
            },
          },
          postCount: {
            $size: "$posts",
          },
          isAuthor: {
            $cond: {
              if: { $eq: ["$_id", req.user?._id] },
              then: true,
              else: false,
            },
          },
        },
      },

      {
        $project: {
          username: 1,
          name: 1,
          email: 1,
          avatar: 1,
          about: 1,
          coverImage: 1,
          posts: 1,
          videos: 1,
          courses: 1,
          followers: 1,
          followings: 1,
          isFollowing: 1,
          isAuthor: 1,
          followersCount: 1,
          followingsCount: 1,
          postCount: 1,
        },
      },
    ]);
    if (!profile.length) {
      throw new ApiError(404, "Profile does not exist");
    }
    return res
      .status(200)
      .json(new ApiResponse(200, profile[0], "User fetched successfully"));
  } catch (error) {
    throw new ApiError(500, error.message);
  }
});


 const getTeacherProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username) {
    throw new ApiError(400, "Username is required");
  }

  const teacher = await User.aggregate([
    {
      $match: {
        username: username,
        role: "teacher", // make sure role exists
      },
    },

    /* ================= COURSES ================= */
    {
      $lookup: {
        from: "courses",
        localField: "_id",
        foreignField: "author",
        as: "courses",
        pipeline: [
          {
            $match: { isPublished: true },
          },
          {
            $project: {
              _id: 1,
              title: 1,
              thumbnail: 1,
              sellingPrice: 1,
              rating: 1,
            },
          },
        ],
      },
    },

    /* ================= ENROLLMENTS ================= */
    {
      $lookup: {
        from: "enrolleds",
        localField: "_id",
        foreignField: "teacher_Id", // if you store teacher reference
        as: "students",
      },
    },

    /* ================= FOLLOWERS ================= */
    {
      $lookup: {
        from: "follows",
        localField: "_id",
        foreignField: "following",
        as: "followers",
      },
    },

    /* ================= REVIEWS ================= */
    {
      $lookup: {
        from: "reviews",
        localField: "_id",
        foreignField: "teacher_Id",
        as: "reviews",
      },
    },

    /* ================= CALCULATED FIELDS ================= */
    {
      $addFields: {
        totalCourses: { $size: "$courses" },
        totalStudents: { $size: "$students" },
        followersCount: { $size: "$followers" },
        totalReviews: { $size: "$reviews" },
        rating: {
          $cond: {
            if: { $gt: [{ $size: "$reviews" }, 0] },
            then: { $avg: "$reviews.rating" },
            else: 0,
          },
        },
      },
    },

    /* ================= FINAL PROJECTION ================= */
    {
      $project: {
        name: 1,
        username: 1,
        bio: 1,
        avatar: 1,
        coverImage: 1,
        expertise: 1,
        totalCourses: 1,
        totalStudents: 1,
        totalReviews: 1,
        rating: { $round: ["$rating", 1] },
        followersCount: 1,
        courses: 1,
      },
    },
  ]);

  if (!teacher || teacher.length === 0) {
    throw new ApiError(404, "Teacher not found");
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      teacher[0],
      "Teacher profile fetched successfully"
    )
  );
});

const getUserAccount = asyncHandler(async (req, res) => {
  const { _id } = req.params;
  if (!_id) {
    throw new ApiError(400, "_id is missing");
  }
  const userAccount = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(_id),
      },
    },
    {
      $lookup: {
        from: "useraddresses",
        localField: "_id",
        foreignField: "user_Id",
        as: "address",
      },
    },
    {
      $lookup: {
        from: "qualifications",
        localField: "_id",
        foreignField: "user_Id",
        as: "qualifications",
      },
    },
    // {
    //   $lookup: {
    //     from: "results",
    //     localField: "_id",
    //     foreignField: "user_Id",
    //     as: "results",
    //   },
    // },
    {
      $lookup: {
        from: "personaldetails",
        localField: "_id",
        foreignField: "user_Id",
        as: "personaldetails",
      },
    },
    {
      $project: {
        username: 1,
        name: 1,
        mobileNumber: 1,
        email: 1,
        about: 1,
        DateofBirth: 1,
        avatar: 1,
        coverImage: 1,
        address: 1,
        qualifications: 1,
        // results: 1,
        personaldetails: 1,
      },
    },
    {
      $addFields: {
        personaldetails: {
          $arrayElemAt: ["$personaldetails", 0],
        },
        address: {
          $arrayElemAt: ["$address", 0],
        },
      },
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, userAccount, "User fetched successfully"));
});

const followToNewUser = asyncHandler(async (req, res) => {
  const { following } = req.params;
  if (!following) {
    throw new ApiError(400, "Following user ID is missing");
  }
  if (following == req.user._id) {
    throw new ApiError(400, "You can't follow yourself");
  }
  const check = await Follow.findOneAndDelete({
    follower: req.user._id,
    following,
  });
  if (check?.follower) {
    return res.status(200).json(new ApiResponse(200, "", "Unfollowing to "));
  }
  const follow = await Follow.create({
    follower: req.user._id,
    following,
  });
  return res.status(200).json(new ApiResponse(200, follow, "Following to "));
});

const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "author",
              foreignField: "_id",
              as: "author",
              pipeline: [
                {
                  $project: {
                    username: 1,
                    name: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              author: {
                $arrayElemAt: ["$author", 0],
              },
            },
          },
        ],
      },
    },
    {},
  ]);

  return res
    .status(200)
    .json(200, user[0].watchHistory, "watchHistory fetched successfully");
});

export {
  getUserName,
  registerUser,
  registerWithSocial,
  resendCode,
  verifyCode,
  loginUser,
  handleSocialLogin,
  logOutUser,
  requestResetPassword,
  resetPassword,
  getAllUsers,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  getUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getProfile,
  getUserProfile,
  getUserAccount,
  followToNewUser,
  getWatchHistory,
  getTeacherProfile,
};
