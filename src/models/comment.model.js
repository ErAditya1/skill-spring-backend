import mongoose,{Schema} from "mongoose";

const commentSchema = new Schema({
    user_Id : {
        type: mongoose.Types.ObjectId,
        ref: "User",
        required: true,
    },
    post_Id : {
        type: mongoose.Types.ObjectId,
        ref: "Post",
    },
    course_Id : {
        type: mongoose.Types.ObjectId,
        ref: "Course",
    },
    video_Id : {
        type: mongoose.Types.ObjectId,
        ref: "Video",
    },
    comment_Id : {
        type: mongoose.Types.ObjectId,
        ref: "Comment",
    },
    comment: {
        type: String,
        required: true,
    }
    
},{timestamps: true});

export const Comment = mongoose.model("Comment", commentSchema);