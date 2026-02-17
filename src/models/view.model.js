import mongoose , {Schema}from "mongoose"

const viewSchema = new Schema({
    user_Id: {
        type : mongoose.Types.ObjectId,
        ref: "User",
        required:true
    },
    course_Id:{
        type: mongoose.Types.ObjectId,
        ref: "Course"
    },
    post_Id:{
        type:mongoose.Types.ObjectId,
        ref:"Post"
    },
    video_Id:{
        type:mongoose.Types.ObjectId,
        ref:"Video"
    }
},{timestamps:true})

export const View = mongoose.model('View',viewSchema);