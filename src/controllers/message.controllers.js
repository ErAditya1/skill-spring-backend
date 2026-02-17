import mongoose from "mongoose";
import { ChatEventEnum } from "../constants.js";
import { Chat } from "../models/chat.model.js";
import { ChatMessage } from "../models/message.model.js";
import { emitSocketEvent } from "../socket/index.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { deleteCloudinaryFile, uploadOnCloudinary } from "../utils/cloudinary.js";
import axios from "axios"
import * as cheerio from 'cheerio';
import { pushNotification } from "./notification.controller.js";

// import {
//   getLocalPath,
//   getStaticFilePath,
//   removeLocalFile,
// } from "../utils/helpers.js";


const chatMessageCommonAggregation = () => {
  return [
    {
      $lookup: {
        from: "users",
        foreignField: "_id",
        localField: "sender",
        as: "sender",
        pipeline: [
          {
            $project: {
              username: 1,
              name:1,
              avatar: 1,
              email: 1,
              isOnline:1
            },
          },
        ],
      },
    },
    {
      $addFields: {
        sender: { $first: "$sender" },
      },
    },
  ];
};

async function getLinkPreview(url) {
  try {
    const { data } = await axios.get(url);  // Fetch the page content
    const $ = cheerio.load(data);  // Load HTML content into Cheerio

    // Extract the Open Graph metadata (OG) tags
    const title = $('meta[property="og:title"]').attr('content') || $('title').text();
    const description = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content');
    const image = $('meta[property="og:image"]').attr('content') || $('meta[name="image"]').attr('content');

    return { title, description, image };
  } catch (error) {
    console.error('Error fetching link preview:', error);
    return null;  // In case of failure, return null
  }
}

const getAllMessages = asyncHandler(async (req, res) => {
  const { chatId } = req.params;

  const selectedChat = await Chat.findById(chatId);

  if (!selectedChat) {
    throw new ApiError(404, "Chat does not exist");
  }

  // Only send messages if the logged in user is a part of the chat he is requesting messages of
  if (!selectedChat.participants?.includes(req.user?._id)) {
    throw new ApiError(400, "User is not a part of this chat");
  }

  const unreadMessages = await ChatMessage.find({
    chat: selectedChat._id,
    sender: { $ne: req.user._id }, // Exclude messages sent by the user
    // status: {$ne : 'read'},
    readBy: { $ne: req.user._id },              // Messages not read by the user
  });
  




  unreadMessages.forEach(async(message) =>{
    const msg = await ChatMessage.findByIdAndUpdate(
      
      message._id,
      { 
        $addToSet: { readBy: req.user._id },
        status: 'read'
      },
      
      { new: true }
    )
    message.status = 'read'
    emitSocketEvent(
      req,
      message.sender.toString(),
      ChatEventEnum.MESSAGE_DELIVERED_EVENT,
      msg
    );
  }
  );
  

  



  const messages = await ChatMessage.aggregate([
    {
      $match: {
        chat: new mongoose.Types.ObjectId(chatId),
      },
    },
    ...chatMessageCommonAggregation(),
    {
      $sort: {
        createdAt: 1,
      },
    },
  ]);
  

  return res
    .status(200)
    .json(
      new ApiResponse(200, messages || [], "Messages fetched successfully")
    );
});

const sendMessage = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const { content } = req.body;


    // Regex to detect URLs in the message
  

  if (!content && !req.files?.attachments?.length) {
    throw new ApiError(400, "Message content or attachment is required");
  }

  const selectedChat = await Chat.findById(chatId);

  if (!selectedChat) {
    throw new ApiError(404, "Chat does not exist");
  }

  

  // Create a new message instance with appropriate metadata
  const message = await ChatMessage.create({
    sender: new mongoose.Types.ObjectId(req.user._id),
    content: content || "",
    chat: new mongoose.Types.ObjectId(chatId),
    attachments: [],
    status:'sent'
  });

  
  const urlRegex = /https?:\/\/[^\s]+/g;
  const urls = content.match(urlRegex);

  if (urls){
    // Process each URL and save the link preview
    const urlpreviews = await Promise.all(
      urls.map(async (url) => {
        const preview = await getLinkPreview(url);
        const parsedUrl = new URL(url);
       if(preview?.title){
        return {
          title: preview.title,
          description: preview.description,
          image: preview.image,
          url: url,
          domain: parsedUrl.origin
        };
       }
      })
    );
    if(urlpreviews.length>0){
      message.urlpreviews.push(...urlpreviews);
      await message.save();
    }
  }

 
  // Process attachments if present
  if (req.files && req.files.attachments?.length > 0) {
    const attachments = await Promise.all(
      req.files.attachments.map(async (attachment) => {
        const file = await uploadOnCloudinary(attachment.path);
        
        return {
          url: file.secure_url,
          public_id: file.public_id,
          type: file.resource_type,
          size: file.bytes,
        };
      })
    );

    // Push all attachments to the message at once
    message.attachments.push(...attachments);
    await message.save();
  }
 
 
  
  // update the chat's last message which could be utilized to show last message in the list item
  const chat = await Chat.findByIdAndUpdate(
    chatId,
    {
      $set: {
        lastMessage: message._id,
      },
    },
    { new: true }
  );

  // structure the message
  const messages = await ChatMessage.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(message._id),
      },
    },
    ...chatMessageCommonAggregation(),
  ]);

  // Store the aggregation result
  const receivedMessage = messages[0];

  if (!receivedMessage) {
    throw new ApiError(500, "Internal server error");
  }

  // logic to emit socket event about the new message created to the other participants
  chat.participants.forEach(async(participantObjectId) => {
    // here the chat is the raw instance of the chat in which participants is the array of object ids of users
    // avoid emitting event to the user who is sending the message
 
    if (participantObjectId.toString() === req.user._id.toString()) return;
         
    const user = onlineUsers.get(participantObjectId.toString())
    // console.log('online user', user);
    if(!chat.isGroupChat && user){
      receivedMessage.status = 'delivered';
      await ChatMessage.findByIdAndUpdate(message._id, {
        $set: { status: 'delivered' },
      });
    }
    // emit the receive message event to the other participants with received message as the payload
    emitSocketEvent(
      req,
      participantObjectId.toString(),
      ChatEventEnum.MESSAGE_RECEIVED_EVENT,
      receivedMessage
    );
    // pushNotification(participantObjectId)
  });
  
  return res
    .status(201)
    .json(new ApiResponse(201, receivedMessage, "Message saved successfully"));
 

  
  

});

const deleteMessage = asyncHandler(async (req, res) => {
  //controller to delete chat messages and attachments

  const { chatId, messageId } = req.params;

  //Find the chat based on chatId and checking if user is a participant of the chat
  const chat = await Chat.findOne({
    _id: new mongoose.Types.ObjectId(chatId),
    participants: req.user?._id,
  });

  if (!chat) {
    throw new ApiError(404, "Chat does not exist");
  }

  //Find the message based on message id
  const message = await ChatMessage.findOne({
    _id: new mongoose.Types.ObjectId(messageId),
  });

  if (!message) {
    throw new ApiError(404, "Message does not exist");
  }

  // Check if user is the sender of the message
  if (message.sender.toString() !== req.user._id.toString()) {
    throw new ApiError(
      403,
      "You are not the authorised to delete the message, you are not the sender"
    );
  }
  if (message.attachments.length > 0) {
    //If the message is attachment  remove the attachments from the server
    message.attachments.map(async(asset) => {
      await deleteCloudinaryFile(asset.public_id)
    });
  }
  //deleting the message from DB
  await ChatMessage.deleteOne({
    _id: new mongoose.Types.ObjectId(messageId),
  });

  //Updating the last message of the chat to the previous message after deletion if the message deleted was last message
  if (chat.lastMessage.toString() === message._id.toString()) {
    const lastMessage = await ChatMessage.findOne(
      { chat: chatId },
      {},
      { sort: { createdAt: -1 } }
    );

    await Chat.findByIdAndUpdate(chatId, {
      lastMessage: lastMessage ? lastMessage?._id : null,
    });
  }
  chat.participants.forEach((participantObjectId) => {
    if (participantObjectId.toString() === req.user._id.toString()) return;
    emitSocketEvent(
      req,
      participantObjectId.toString(),
      ChatEventEnum.MESSAGE_DELETE_EVENT,
      message
    );
  });

  return res
    .status(200)
    .json(new ApiResponse(200, message, "Message deleted successfully"));
});

export { getAllMessages, sendMessage, deleteMessage };
