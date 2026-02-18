import { Category } from "../models/category.model.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Course } from "../models/course.model.js";
import { User } from "../models/user.model.js";
import { Enrolled } from "../models/enrolled.model.js";







/* =======================================================
   GET ADMIN DASHBOARD STATS
   ======================================================= */

export const getAdminDashboard = asyncHandler(async (req, res) => {
  try {
    /* ---------------- Total Students ---------------- */
    const totalStudents = await User.countDocuments({
      role: "student",
    });

    /* ---------------- Total Courses ---------------- */
    const totalCourses = await Course.countDocuments();

    /* ---------------- Pending Approvals ---------------- */
    const pendingApprovals = await Course.countDocuments({
      status: "pending",
    });

    /* ---------------- Platform Revenue ---------------- */
    const revenueAgg = await Enrolled.aggregate([
      {
        $lookup: {
          from: "courses",
          localField: "course_Id",
          foreignField: "_id",
          as: "course",
        },
      },
      {
        $unwind: "$course",
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$course.sellingPrice" },
        },
      },
    ]);

    const totalRevenue =
      revenueAgg.length > 0 ? revenueAgg[0].totalRevenue : 0;

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          totalStudents,
          totalCourses,
          totalRevenue,
          pendingApprovals,
        },
        "Admin dashboard data fetched successfully"
      )
    );
  } catch (error) {
    console.log(error);
  }
});


/* =======================================================
   GET PENDING COURSES
   ======================================================= */

export const getPendingCourses = asyncHandler(async (req, res) => {
  const pendingCourses = await Course.aggregate([
    {
      $match: {
        status: "pending",
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "author",
        foreignField: "_id",
        as: "author",
        pipeline: [
          {
            $project: {
              _id: 1,
              name: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        author: { $arrayElemAt: ["$author", 0] },
      },
    },
    {
      $project: {
        title: 1,
        createdAt: 1,
        author: 1,
      },
    },
    {
      $sort: { createdAt: -1 },
    },
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      pendingCourses,
      "Pending courses fetched successfully"
    )
  );
});


// ==============================
// CREATE CATEGORY (Admin Only)
// ==============================
export const createCategory = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  if (!name || name.trim() === "") {
    throw new ApiError(400, "Category name is required");
  }

  const slug = name.toLowerCase().trim().replace(/\s+/g, "-");

  const existingCategory = await Category.findOne({ slug });

  if (existingCategory) {
    throw new ApiError(400, "Category already exists");
  }

  const category = await Category.create({
    name: name.trim(),
    slug,
    description,
    createdBy: req.user._id,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, category, "Category created successfully"));
});

// ==============================
// GET ALL CATEGORIES
// ==============================
export const getAllCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find()
    .populate("createdBy", "username email")
    .sort({ createdAt: -1 });

  return res
    .status(200)
    .json(new ApiResponse(200, categories, "Categories fetched successfully"));
});

// ================= UPDATE =================
export const updateCategory = asyncHandler(async (req, res) => {
  const { _id } = req.params;
  const { name, description } = req.body;

  const category = await Category.findById(_id);
  if (!category) {
    throw new ApiError(404, "Category not found");
  }

  if (name) {
    category.name = name.trim();
    category.slug = name.toLowerCase().trim().replace(/\s+/g, "-");
  }

  if (description !== undefined) {
    category.description = description;
  }

  await category.save();

  return res
    .status(200)
    .json(new ApiResponse(200, category, "Category updated successfully"));
});



// ==============================
// DELETE CATEGORY
// ==============================
export const deleteCategory = asyncHandler(async (req, res) => {
  const { _id } = req.params;

  if (!_id) {
    throw new ApiError(400, "Category ID is required");
  }

  const category = await Category.findById(_id);

  if (!category) {
    throw new ApiError(404, "Category not found");
  }

  await Category.findByIdAndDelete(_id);

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Category deleted successfully"));
});


export const approveCourse = asyncHandler(async (req, res) => {
  const { _id } = req.params;
  const {status} = req.body;

   if (!["approved", "rejected"].includes(status)) {
    throw new ApiError(400, "Invalid status. Must be 'approved' or 'rejected'.");
  }

  const course = await Course.findByIdAndUpdate(
    _id,
    { status: status, isPublished: status === "approved" },
    { new: true },
  );

  return res
    .status(200)
    .json(new ApiResponse(200, course, "Course approved successfully"));
});

export const getAllApprovalCourse = asyncHandler(async (req, res) => {
  const course = await Course.find({$or:[{ status: "pending" }, { status: "approved" }, { status: "rejected" }]}).populate("author", "name email avatar").sort({ createdAt: -1 });
  return res
    .status(200)
    .json(new ApiResponse(200, course, "Pending courses fetched successfully"));
})



/* =========================================================
   GET ALL USERS (with search + filters)
========================================================= */


export const getAllUsers = asyncHandler(async (req, res) => {
  const { search, role, status } = req.query;

  let matchStage = {};

  /* ---------------- SEARCH ---------------- */
  if (search) {
    matchStage.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  /* ---------------- ROLE FILTER ---------------- */
  if (role && role !== "all") {
    matchStage.role = role;
  }

  /* ---------------- STATUS FILTER ---------------- */
  if (status && status !== "all") {
    matchStage.status = status;
  }

  const users = await User.aggregate([
    {
      $match: matchStage,
    },

    /* ================= ENROLLED COURSES ================= */
    {
      $lookup: {
        from: "enrolleds", // your collection name
        localField: "_id",
        foreignField: "user_Id",
        as: "enrolledCourses",
      },
    },

    /* ================= CREATED COURSES ================= */
    {
      $lookup: {
        from: "courses",
        localField: "_id",
        foreignField: "author",
        as: "createdCourses",
      },
    },

    /* ================= ADD COUNTS ================= */
    {
      $addFields: {
        enrolledCoursesCount: { $size: "$enrolledCourses" },
        createdCoursesCount: { $size: "$createdCourses" },
      },
    },

    /* ================= REMOVE SENSITIVE FIELDS ================= */
    {
      $project: {
        password: 0,
        refreshToken: 0,
        enrolledCourses: 0,
        createdCourses: 0,
      },
    },

    {
      $sort: { createdAt: -1 },
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, users, "Users fetched successfully"));
});


/* =========================================================
   BLOCK / UNBLOCK USER
========================================================= */

export const toggleBlockUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (user.role === "admin") {
    throw new ApiError(403, "Admin cannot be blocked");
  }

  user.status = user.status === "active" ? "blocked" : "active";

  await user.save();

  return res.status(200).json(
    new ApiResponse(200, user, `User ${user.status} successfully`)
  );
});

/* =========================================================
   DELETE USER
========================================================= */

export const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (user.role === "admin") {
    throw new ApiError(403, "Admin cannot be deleted");
  }

  await user.deleteOne();

  return res
    .status(200)
    .json(new ApiResponse(200, null, "User deleted successfully"));
});

/* =========================================================
   UPDATE USER ROLE
========================================================= */

export const updateUserRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!["student", "instructor", "admin"].includes(role)) {
    throw new ApiError(400, "Invalid role");
  }

  const user = await User.findByIdAndUpdate(
    id,
    { role },
    { new: true }
  ).select("-password -refreshToken");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, user, "User role updated successfully"));
});

// teacher earnings

import { Payment } from "../models/payment.model.js";
import mongoose from "mongoose";

export const getTeacherEarnings = asyncHandler(async (req, res) => {
  const teacherId = req.user._id;
  const range = Number(req.query.range) || 30;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - range);

  /* ================= TOTAL EARNINGS ================= */

  const totalAgg = await Payment.aggregate([
    {
      $match: {
        teacher_Id: new mongoose.Types.ObjectId(teacherId),
        status: "completed",
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$teacherAmount" },
      },
    },
  ]);

  const totalEarnings = totalAgg[0]?.total || 0;

  /* ================= PERIOD EARNINGS ================= */

  const periodAgg = await Payment.aggregate([
    {
      $match: {
        teacher_Id: new mongoose.Types.ObjectId(teacherId),
        status: "completed",
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$teacherAmount" },
      },
    },
  ]);

  const monthlyEarnings = periodAgg[0]?.total || 0;

  /* ================= PREVIOUS PERIOD (FOR GROWTH) ================= */

  const prevStart = new Date(startDate);
  prevStart.setDate(prevStart.getDate() - range);

  const prevAgg = await Payment.aggregate([
    {
      $match: {
        teacher_Id: new mongoose.Types.ObjectId(teacherId),
        status: "completed",
        createdAt: {
          $gte: prevStart,
          $lt: startDate,
        },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$teacherAmount" },
      },
    },
  ]);

  const previousTotal = prevAgg[0]?.total || 0;

  const growthRate =
    previousTotal === 0
      ? 100
      : (((monthlyEarnings - previousTotal) / previousTotal) * 100).toFixed(1);

  /* ================= PENDING BALANCE ================= */

  const pendingAgg = await Payment.aggregate([
    {
      $match: {
        teacher_Id: new mongoose.Types.ObjectId(teacherId),
        status: "pending",
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$teacherAmount" },
      },
    },
  ]);

  const pendingBalance = pendingAgg[0]?.total || 0;

  /* ================= NEXT PAYOUT ================= */

  const nextPayoutDate = new Date();
  nextPayoutDate.setDate(nextPayoutDate.getDate() + 7);

  const nextPayoutAmount = pendingBalance;

  /* ================= TRANSACTIONS ================= */

  const transactions = await Payment.aggregate([
    {
      $match: {
        teacher_Id: new mongoose.Types.ObjectId(teacherId),
      },
    },
    {
      $lookup: {
        from: "courses",
        localField: "course_Id",
        foreignField: "_id",
        as: "course",
      },
    },
    {
      $addFields: {
        course: { $arrayElemAt: ["$course", 0] },
      },
    },
    {
      $group: {
        _id: "$course_Id",
        courseTitle: { $first: "$course.title" },
        amount: { $sum: "$teacherAmount" },
        students: { $sum: 1 },
        date: { $max: "$createdAt" },
      },
    },
    { $sort: { date: -1 } },
    { $limit: 10 },
  ]);

  return res.status(200).json(
    new ApiResponse(200, {
      totalEarnings,
      monthlyEarnings,
      pendingBalance,
      growthRate,
      nextPayoutAmount,
      nextPayoutDate,
      transactions,
    })
  );
});
