import mongoose from "mongoose";
import { View } from "../models/view.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import { Video } from "../models/video.model.js";
// import { ApiResponse } from "../utils/ApiResponse.js";

const postViews = asyncHandler(async (req, res, next) => {
    const { _id } = req.params
    if(!_id){
        throw new ApiError(400, "Id i0s missing")
    }
    const view = await View.findOne({
        post_Id: _id,
        user_Id: req.user._id
    })
    if(!view){
        const newView = await View.create({
            post_Id: _id,
            user_Id: req.user._id
        })
    }
    
    next()
})

const courseViews = asyncHandler(async (req, res, next) => {
    const { _id } = req.params
    if(!_id){
        throw new ApiError(400, "Id i0s missing")
    }
    const view = await View.findOneAndDelete({
        course_Id: _id ,
        user_Id: req.user._id
    })
    
    const newView = await View.create({
        course_Id: _id,
        user_Id: req.user._id
    })
    console.log(newView)

    
    
    next()
})

const videoViews = asyncHandler(async (req, res, next) => {
    const { _id } = req.params
    if(!_id){
        throw new ApiError(400, "Id is missing")
    }
    const video = await Video.findOne({
        videoId:_id
    })
    if(!video){
        throw new ApiError(404, "Video not found")
    }
    const view = await View.findOneAndDelete({
        video_Id: video?._id ,
        user_Id: req.user._id
    })
    
    const newView = await View.create({
        video_Id: video?._id,
        user_Id: req.user._id
    })
    
    
    next()
})


export { postViews , courseViews , videoViews}
