import mongoose, { Schema } from "mongoose";

// TODO: Add image and pdf file sharing in the next version
const chatMessageSchema = new Schema(
  {
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    content: {
      type: String,
    },
    attachments: {
       type:[
        {
          public_id:{
            type: String,
          },
          url:{
            type: String,
          },
          type: {
            type: String
          },
          size: {
            type: Number,
          },
        },
      ],
      default: [],
    },
    urlpreviews: {
      type:[
       {
         title: {
           type: String
         },
         description: {
           type: String
         },
         image: {
           type: String
         },
         domain:{
           type: String
         },
         url:{
           type: String
         }
         
       },
     ],
     default: [],
   },
    chat: {
      type: Schema.Types.ObjectId,
      ref: "Chat",
    },
    status: { 
      type: String, 
      enum: ['pending','sent','delivered','read','rejected'], 
      default: 'pending'
    },
    readBy:
      {
        type: [Schema.Types.ObjectId],
        ref: "User"
      }
    
  },
  { timestamps: true }
);

export const ChatMessage = mongoose.model("ChatMessage", chatMessageSchema);
