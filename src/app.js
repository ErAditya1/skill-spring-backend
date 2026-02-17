import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createServer } from "http"; // To create an HTTP server
import { Server } from "socket.io"; // Add this
import session from "express-session";
import passport from "passport";

const app = express();


app.use(express.json({ limit: "20kb" }));
app.use(express.urlencoded({ extended: true, limit: "20kb" }));
app.use(express.static("public"));
app.use(cookieParser());

global.onlineUsers = new Map();



app.use(
  cors({
    origin:
      process.env.CORS_ORIGIN === "*"
        ? "*"
        : process.env.CORS_ORIGIN?.split(","),
    credentials: true,
  })
);




const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin:
      process.env.CORS_ORIGIN === "*"
        ? "*"
        : process.env.CORS_ORIGIN?.split(","),

    credentials: true,
  },
});




app.set("io", io);




app.use(
  session({
    secret:
      process.env.EXPRESS_SESSION_SECRET ||
      "7fdOMCFRSLD9cv1k-5n3Dz5n3DmVmVHVIg9GG_OGTUkBfLNdgZAwKDNtoCJ0X0cyqaM0ogR80-zh9kx0Mkx",
    resave: true,
    saveUninitialized: true,
    cookie: {
      secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
      httpOnly: true, // Make cookie HTTP only
      sameSite: 'None', // Important for cross-origin requests
    },
  })
);
app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions




// routes
import userRouter from "./routes/user.routes.js";
import adminRouter from "./routes/admin.routes.js";
import postRouter from "./routes/post.routes.js";
import likeRouter from "./routes/like.routes.js";
import saveRouter from "./routes/save.routes.js";
import commentRouter from "./routes/comment.routes.js";
import coursesRouter from "./routes/course.routes.js";
import videoRouter from "./routes/video.routes.js";
import commanRouter from "./routes/comman.routes.js";
import paymentsRouter from "./routes/payment.routes.js";
import quizRouter from "./routes/quiz.routes.js";
import notificationRouter from "./routes/notification.routes.js";

import chatRouter from "./routes/chat.routes.js";
import messageRouter from "./routes/message.routes.js";
import { initializeSocketIO } from "./socket/index.js";
const pushSubscriptions = [];
//routes declaration

app.use("/api/v1/users", userRouter);
app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/posts", postRouter);
app.use("/api/v1/like", likeRouter);
app.use("/api/v1/save", saveRouter);
app.use("/api/v1/comment", commentRouter);
app.use("/api/v1/courses", coursesRouter);
app.use("/api/v1/videos", videoRouter);
app.use("/api/v1/comman", commanRouter);
app.use("/api/v1/payment", paymentsRouter);
app.use("/api/v1/quiz", quizRouter);
app.use("/api/v1/notification", notificationRouter);

app.use("/api/v1/chat-app/chats", chatRouter);
app.use("/api/v1/chat-app/messages", messageRouter);


initializeSocketIO(io);

import { errorHandler } from "./middelwares/error.middelware.js";

app.use(errorHandler);

export { httpServer };
