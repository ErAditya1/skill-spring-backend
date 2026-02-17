import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import { Save } from "../models/save.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
// import { ApiResponse } from "../utils/ApiResponse.js";

const postSave = asyncHandler(async (req, res, next) => {
    const { _id } = req.params
    if(!_id){
        throw new ApiError(400, "Id i0s missing")
    }
    const save = await Save.findOneAndDelete({
        post_Id: _id,
        user_Id: req.user._id
    })
    if(!save){
        await Save.create({
            post_Id: _id,
            user_Id: req.user._id
        })
        return res.status(200).json(new ApiResponse(200,{}, "Post Saved successfully"))
    }
    return res.status(200).json(new ApiResponse(200,{}, "Post Unsaved successfully"))
    
})

const courseSave = asyncHandler(async (req, res, next) => {
    const { _id } = req.params
    if(!_id){
        throw new ApiError(400, "Id i0s missing")
    }
    const save = await Save.findOneAndDelete({
        course_Id: _id ,
        user_Id: req.user._id
    })
    
   if(!save){
    const newSave = await Save.create({
        course_Id: _id,
        user_Id: req.user._id
    })
    return res.status(200).json(new ApiResponse(200,{}, "Course Saved successfully"))
   }
    

    
    
   return res.status(200).json(new ApiResponse(200,{}, "Course UnSaved successfully"))
})

const videoSave = asyncHandler(async (req, res, next) => {
    const { _id } = req.params
    if(!_id){
        throw new ApiError(400, "Id is missing")
    }
    const save = await Save.findOneAndDelete({
        video_Id: _id ,
        user_Id: req.user._id
    })
    
    if(!save){
        const newSave = await Save.create({
            video_Id: _id,
            user_Id: req.user._id
        })
        return res.status(200).json(new ApiResponse(200,{}, "Video Saved successfully"))
    }
     
    
    return res.status(200).json(new ApiResponse(200,{}, "Video UnSaved successfully"))
})


export { postSave , courseSave , videoSave}
