import mongoose, {Schema} from "mongoose";

const paymentSchema = new Schema({
    amount: {
        type: Number,
        required: true,
    },
    sender_Id : {
        type: mongoose.Types.ObjectId,
        ref: "User",
        required: true,
    },
    receiver_Id : {
        type: mongoose.Types.ObjectId,
        ref: "User",
    },
    course_Id:{
        type: mongoose.Types.ObjectId,
        ref: "Course",
    }, 
    razorpay_payment_id: {

        type: String,
        required: true,
    },
    razorpay_order_id: {
        required: true,
        type: String,
    },
    razorpay_signature: {
        required: true,
        type: String,
    },
   
    
   
},{timestamps:true});

export const Payment = mongoose.model("Payment", paymentSchema);