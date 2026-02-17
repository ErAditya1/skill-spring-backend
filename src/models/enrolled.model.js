import mongoose, {Schema, Types} from "mongoose";

const enrolledSchema = new Schema({
    user_Id:{
        type: mongoose.Types.ObjectId,
        ref: "User",
        required: true
    },
    course_Id:{
        type: mongoose.Types.ObjectId,
        ref: "Course"
    },
    transaction_Id: {
        type: String,
    },
    cost:{
        type: String,
    }

},{timestamps: true});

export const Enrolled = mongoose.model("Enrolled",enrolledSchema)