import mongoose from "mongoose";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import webpush from 'web-push';
import { Notification } from "../models/notification.model.js";

// Set up Web Push with VAPID keys (for push notifications)


const vapidKeys = {
  publicKey:
    "BOj4llN4WfhksTyrnYQl4so0KroAfkj6OkdxKYNIVBQKKLWj7nQrfKqZj9kaXpPz5iwJMZZqDedLTcE0r3Edf8M", // Replace with your own public key
  privateKey:
    "ChJmdJ10jqFAkdqsVzH8vY4cpe0UB6uJHuYYlioNvxg", // Replace with your own private key
}
webpush.setVapidDetails(
  'mailto:mradityaji2@gmail.com', // Your email
  vapidKeys.publicKey,
  vapidKeys.privateKey
);


const saveSubscription = asyncHandler(async (req, res) => {
  const { subscription } = req.body;
  console.log(subscription);
  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        subscription,
      },
    },
    { new: true }
  );
  if (!user) {
    throw new ApiError("User not found", 404);
  }
  
  res
    .status(200)
    .json(
      new ApiResponse(200, user, "Subscription endpoint updated successfully")
    );
});



export const pushNotification = async(id)=>{
  const user = await User.findById(id).select('subscription');
 
  if (!user) {
    console.log("No subscription token found for user", user._id);
    return;
  }
  const message = {
    title: "New Message",
    body: "You have received a new message from John.",
    icon: "https://res.cloudinary.com/dcu0jjqte/image/upload/v1732335257/brightveil_light_yr7l9v.jpg",
    image: "https://res.cloudinary.com/dcu0jjqte/image/upload/v1732335257/brightveil_light_yr7l9v.jpg",
    badge: "https://res.cloudinary.com/dcu0jjqte/image/upload/v1732335257/brightveil_light_yr7l9v.jpg",
    url: "https://skillspring-sigma.vercel.app/",
    timestamp: Date.now(),
    data: {
      messageId: "12345",
      userId: "67890"
    },
    tag: "message-notification"
  };
  
  const res = await webpush.sendNotification(user.subscription, JSON.stringify( message ));
  console.log(res);
  return
}

export const sendChatNotification = async (senderId, recipientIds, message) => {
  try {
    const notification = new Notification({
      message: `${senderId} sent you a message: ${message}`,
      type: "chat",
      users: recipientIds.map((userId) => ({ userId, isRead: false })), // For multiple recipients
      senderId,
      referenceType: "chat",
    });

    await notification.save();
    console.log("Chat notification sent to recipients");
  } catch (error) {
    console.error("Error sending chat notification:", error);
  }
};

export const sendCourseOrVideoNotification = async (
  followerIds,
  addedById,
  addedContent,
  contentType
) => {
  try {
    const notificationMessage =
      contentType === "course"
        ? `${addedById} added a new course: ${addedContent.title}`
        : `${addedById} added a new video: ${addedContent.title}`;

    const notification = new Notification({
      message: notificationMessage,
      type: contentType,
      users: followerIds.map((followerId) => ({
        userId: followerId,
        isRead: false,
      })),
      senderId: addedById,
      referenceId: addedContent._id,
      referenceType: contentType,
    });

    await notification.save();
    console.log(`${contentType} notification sent to followers`);
  } catch (error) {
    console.error(`Error sending ${contentType} notification:`, error);
  }
};

export const sendCourseUpdateNotification = async (
  enrolledUserIds,
  courseId,
  updateType,
  updateContent
) => {
  try {
    const updateMessage =
      updateType === "chapter"
        ? `A new chapter has been added to the course: ${updateContent.title}`
        : updateType === "quiz"
        ? `A new quiz has been added to the course: ${updateContent.title}`
        : `New notes have been added to the course: ${updateContent.title}`;

    const notifications = enrolledUserIds.map(async (userId) => {
      const notification = new Notification({
        message: updateMessage,
        type: "course",
        users: [{ userId, isRead: false }],
        senderId: updateContent.createdBy,
        referenceId: courseId,
        referenceType: "course",
      });

      await notification.save();
    });

    await Promise.all(notifications);
    console.log("Course update notification sent to enrolled users");
  } catch (error) {
    console.error("Error sending course update notification:", error);
  }
};

export const sendLikeOrCommentNotification = async (
  authorId,
  actionById,
  videoId,
  actionType
) => {
  try {
    const actionMessage =
      actionType === "like"
        ? `${actionById} liked your video.`
        : `${actionById} commented on your video.`;

    const notification = new Notification({
      message: actionMessage,
      type: actionType, // 'like' or 'comment'
      users: [{ userId: authorId, isRead: false }], // Only notify the author
      senderId: actionById,
      referenceId: videoId,
      referenceType: "video",
    });

    await notification.save();
    console.log(`${actionType} notification sent to video author`);
  } catch (error) {
    console.error("Error sending like/comment notification:", error);
  }
};

// Mark all unread notifications as read for a specific user
export const markAllUnreadNotificationsAsRead = async (req, res) => {
  const userId = req.user._id; // Assuming user ID is coming from JWT or session

  try {
    // Find all notifications where the user is part of it and has not marked it as read yet
    const notifications = await Notification.find({
      "users.userId": userId, // The user should be part of the notification
      "users.isRead": false, // The notification should be unread for the user
    });

    if (notifications.length === 0) {
      return res
        .status(404)
        .json({ error: "No unread notifications found for this user." });
    }

    // Loop through the notifications and mark them as read for the specific user
    for (const notification of notifications) {
      const userIndex = notification.users.findIndex(
        (user) => user.userId.toString() === userId.toString()
      );
      if (userIndex !== -1) {
        // Mark this user's notification as read
        notification.users[userIndex].isRead = true;
        await notification.save();
      }
    }

    return res
      .status(200)
      .json({ message: "All unread notifications have been marked as read." });
  } catch (error) {
    console.error("Error marking notifications as read:", error);
    return res
      .status(500)
      .json({ error: "Something went wrong while marking the notifications." });
  }
};
// Mark multiple notifications as read for a specific user
const markNotificationAsRead = async (req, res) => {
  const { notificationIds } = req.body;
  const userId = req.user._id;

  if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
    return res.status(400).json({
      error: "Notification IDs should be an array and cannot be empty.",
    });
  }

  try {
    const notifications = await Notification.find({
      _id: { $in: notificationIds },
    });

    if (notifications.length === 0) {
      return res.status(404).json({ error: "No notifications found." });
    }

    for (const notification of notifications) {
      // Only modify if the user is part of the notification
      const userIndex = notification.users.indexOf(userId);

      if (userIndex !== -1) {
        // Remove user from the notification
        notification.users.splice(userIndex, 1);
        await notification.save();

        // If no users are left, delete the notification
        if (notification.users.length === 0) {
          await Notification.deleteOne({ _id: notification._id });
        }
      }
    }

    return res
      .status(200)
      .json({ message: "Notifications marked as read and updated." });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: "Something went wrong while marking the notifications." });
  }
};

// Get notifications for a user
const getUserNotifications = async (req, res) => {
  const { userId } = req.user;

  try {
    const notifications = await Notification.find({ users: userId });
    return res.status(200).json({ notifications });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: "Something went wrong while fetching notifications." });
  }
};

export { saveSubscription, markNotificationAsRead, getUserNotifications };
