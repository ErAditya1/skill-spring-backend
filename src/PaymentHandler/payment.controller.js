import crypto from "crypto";
import { Payment } from "../models/payment.model.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Course } from "../models/course.model.js";
import { Enrolled } from "../models/enrolled.model.js";

import Razorpay from "razorpay";
import { Chat } from "../models/chat.model.js";
import { sendPurchaseConfirmation } from "../helpers/mailer.js";

const instance = new Razorpay({
  key_id: process.env.RAZOR_PAY_API_KEY_ID,
  key_secret: process.env.RAZOR_PAY_API_KEY_SECRET,
  // mode: process.env.RAZORPAY_MODE
});
const createPayment = asyncHandler(async (req, res) => {
  const { amount } = req.body;

  try {
    const options = {
      amount: Number(amount) * 100,
      currency: "INR",
      receipt: crypto.randomBytes(10).toString("hex"),
      payment_capture: 1,
    };

    instance.orders.create(options, async (error, order) => {
      if (error) {
        console.log(error);
        throw new ApiError(500, error.message);
      }

      if (!order) {
        throw new ApiError(500, "Order Id Could not generated!");
      }

      res
        .status(200)
        .json(
          new ApiResponse(
            200,
            order,
            "Payment Created pay amount: " + order.amount
          )
        );
    });
  } catch (error) {
    console.log(error);
    throw new ApiError(500, "Internal Server Error!");
  }
});

const validatePayment = asyncHandler(async (req, res, next) => {
  try {
    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      amount,
      course,
      receiver_Id,
    } = req.body;

    const sha = crypto.createHmac(
      "sha256",
      process.env.RAZOR_PAY_API_KEY_SECRET
    );
    sha.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const signature = sha.digest("hex");

    if (signature !== razorpay_signature) {
      throw new ApiError(400, "Transaction is not legitimate!");
    }

    // Check for existing payment

    const existingPayment = await Payment.findOne({ razorpay_payment_id });
    if (existingPayment) {
      throw new ApiError(400, "Payment already processed!");
    }

    const cs= await Course.findById(course).select('author')
    console.log(cs);

    const payment = await Payment.create({
      amount: amount / 100,
      sender_Id: req.user?._id,
      receiver_Id: receiver_Id|| cs || null,
      course_Id: course,
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
    });
    console.log(payment);
    next();
  } catch (error) {
    console.log(error);
    throw new ApiError(500, "Payment validation failed!");
  }
});

const enrollCourse = asyncHandler(async (req, res) => {
  const { course_Id } = req.params;
  if (!course_Id) {
    throw new ApiError(400, "Course Id is required!");
  }
  const course = await Course.findById(course_Id);
  if (!course) {
    throw new ApiError(404, "Course not found!");
  }
  const enrolled = await Enrolled.findOne({
    course_Id,
    user_Id: req.user?._id,
  });
  // if (enrolled) {
  //   throw new ApiError(400, "You have already enrolled in this course!");
  // }
  const payment = await Payment.findOne({
    course_Id,
    sender_Id: req.user?._id,
    receiver_Id: course.author,
  });

  console.log(payment)

  if (course.sellingPrice !== 0 && !payment) {
    throw new ApiError(400, "This course is not available for free!");
  }

  const newEnrolled = await Enrolled.create({
    course_Id,
    user_Id: req.user?._id,
    transaction_Id: payment ? payment.razorpay_payment_id : null,
    cost: course.sellingPrice,
  });

  const chat = await Chat.findOneAndUpdate(
    {
      course_Id,
      admin: course.author,
    },
    {
      $addToSet: {
        participants: req.user._id,
      },
    },
    {
      new: true,
    }
  );

  sendPurchaseConfirmation({ email:req.user.email, username:req.user.username, courseName:course.title,course_id:course._id})
 
  return res
    .status(200)
    .json(new ApiResponse(200, newEnrolled, "Course Enrolled successfully!"));
});

export { createPayment, validatePayment, enrollCourse };
