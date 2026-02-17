import cookie from "cookie";
import jwt from "jsonwebtoken";
import { Server, Socket } from "socket.io";
import { AvailableChatEvents, ChatEventEnum } from "../constants.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ChatMessage } from "../models/message.model.js";



const mountJoinChatEvent = (socket) => {
  socket.on(ChatEventEnum.JOIN_CHAT_EVENT, (chatId) => {
    console.log(`User joined the chat 🤝. chatId: `, chatId);
    socket.join(chatId);
  });
};


const mountParticipantTypingEvent = (socket) => {
  socket.on(ChatEventEnum.TYPING_EVENT, (chatId) => {
    console.log(`User is typing in the chat ��. chatId: `, chatId);
    socket.in(chatId).emit(ChatEventEnum.TYPING_EVENT, chatId);
  });
};


const mountParticipantStoppedTypingEvent = (socket) => {
  socket.on(ChatEventEnum.STOP_TYPING_EVENT, (chatId) => {
    console.log(`User stoped typing in the chat ��. chatId: `, chatId);
    socket.in(chatId).emit(ChatEventEnum.STOP_TYPING_EVENT, chatId);
  });
};

const mountUpdateDeliveredMessage = async(io,user) => {
  const messages = await ChatMessage.find(
        
    { sender: { $ne: user._id }, status: 'sent', readBy: { $ne: user._id } },
    
  );
  messages.forEach(async(message) => {
    // Update message status to 'delivered'
    await ChatMessage.updateOne(
        { _id: message._id },
        {$set: {status: 'delivered'}},
    );
    message.status = 'delivered';
    // Emit the delivered event
      
      io.in(message.sender.toString()).emit(ChatEventEnum.MESSAGE_DELIVERED_EVENT, message);
      console.log("Socket emitted")
    
});
  
};

const mountMarkAsRead = async (socket)=>{
  socket.on(ChatEventEnum.MESSAGE_MARK_AS_READ_EVENT, async (_id) => {
    
    const msg = await ChatMessage.findOneAndUpdate(
        { _id:_id, sender: { $ne: socket.user._id }, status: 'delivered', readBy: { $ne: socket.user._id } },
        {
          $set: {
            readBy: socket.user._id,
            status: 'read',
          },

        },
    );
    
    if(msg){
      msg.status = 'read'
      socket.in(msg?.sender?.toString()).emit(ChatEventEnum.MESSAGE_DELIVERED_EVENT, msg);
      
    }
  });

}

const initializeSocketIO = (io) => {
  
  return io.on("connection", async (socket) => {
    
    try {
      // parse the cookies from the handshake headers (This is only possible if client has `withCredentials: true`)
      const cookies = cookie.parse(socket.handshake.headers?.cookie || "");

      let token = cookies?.accessToken; // get the accessToken

      if (!token) {
        // If there is no access token in cookies. Check inside the handshake auth
        token = socket.handshake.auth?.token;
      }
      if (!token) {
        // Token is required for the socket to work
        throw new ApiError(401, "Un-authorized handshake. Token is missing");
      }

      const decodedToken = jwt.verify(token, process.env.JWT_SECRET); // decode the token

      const user = await User.findById(decodedToken?._id).select(
        "-password -refreshToken -emailVerificationToken -emailVerificationExpiry"
      );
      

      // retrieve the user
      if (!user) {
        throw new ApiError(401, "Un-authorized handshake. Token is invalid");
      }
      user.isOnline = true;
      await user.save();
      

      
      socket.user = user; // mounte user object to the socket
      
      global.onlineUsers.set(user._id.toString(),user) 

      




      socket.join(user._id.toString());
      socket.emit(ChatEventEnum.CONNECTED_EVENT); 
      console.log("User connected 🗼. userId: ", user._id.toString());

      io.emit(ChatEventEnum.USER_ONLINE_EVENT, {user: user._id,username:socket.user?.username ,  status:true});
      // Common events that needs to be mounted on the initialization
      mountJoinChatEvent(socket);
      mountParticipantTypingEvent(socket);
      mountParticipantStoppedTypingEvent(socket);
      mountMarkAsRead(socket);
      mountUpdateDeliveredMessage(io,user)

      socket.on(ChatEventEnum.DISCONNECT_EVENT, async() => {
        console.log("user has disconnected 🚫. userId: " + socket.user?._id);
        io.emit(ChatEventEnum.USER_ONLINE_EVENT, {user: socket.user?._id,username:socket.user?.username , status:false});
        await User.findByIdAndUpdate(socket.user._id,{
          $set:{
            isOnline: false,
          }
        })
        global.onlineUsers.delete(socket.user._id.toString())
        if (socket.user?._id) {
          socket.leave(socket.user._id);
        }
      });
    } catch (error) {
      socket.emit(
        ChatEventEnum.SOCKET_ERROR_EVENT,
        error?.message || "Something went wrong while connecting to the socket."
      );
    }
  });
};


const emitSocketEvent = (req, roomId, event, payload) => {
  req.app.get("io").in(roomId).emit(event, payload);
};

export { initializeSocketIO, emitSocketEvent };
