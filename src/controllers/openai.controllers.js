import mongoose from "mongoose";
import { ChatEventEnum } from "../constants.js";
import { Chat } from "../models/chat.model.js";
import { ChatMessage } from "../models/message.model.js";
import { emitSocketEvent } from "../socket/index.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { deleteCloudinaryFile, uploadOnCloudinary } from "../utils/cloudinary.js";
import { Configuration, OpenAIApi } from "openai";


const openaiConfig = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  });
  const openai = new OpenAIApi(openaiConfig);
  const huggingfaceApiKey = process.env.HUGGINGFACE_API_KEY;


const chatWithOpenAi = asyncHandler(async(req, res)=>{
    const { text } = req.body;
    const chat = await Chat.findOne({ openAi: true });
    const chatMessage = await ChatMessage.create({
        user: chat.users[0],
        text,
    });
})