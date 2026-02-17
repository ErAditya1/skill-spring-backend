import mongoose,{Schema} from 'mongoose';

const likesSchema = new Schema({
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
    comment_Id: {
        type: mongoose.Types.ObjectId,
        ref: "Comment",
    },
    video_Id:{
        type: mongoose.Types.ObjectId,
        ref: "Video",
    }

    
},{timestamps: true});  

export const Like = mongoose.model("Like",likesSchema)