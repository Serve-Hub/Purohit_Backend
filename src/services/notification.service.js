import Notification from "../models/notification.model.js";
import { setupWebSocket } from "./config/websocket.js"; // WebSocket server setup
import asyncHandler from "../utils/asyncHandler.js";

// Set up WebSocket server instance from your existing config
const wss = setupWebSocket();

// Function to save the notification to the database
const saveNotificationToDatabase = asyncHandler(async (notificationData) => {
  const notification = new Notification(notificationData);
  await notification.save();
  console.log("Notification saved to database");
  return notification;
});

const sendNotificationToSpecificUser = asyncHandler(
  async (targetUserId, notificationData) => {
    // Step 1: Save the notification to the database
    notificationData.userId = targetUserId; // Include the user ID in the notification
    const savedNotification = await saveNotificationToDatabase(
      notificationData
    );

    // Step 2: Send the notification to the specific user via WebSocket
    wss.sendNotificationToSpecificUser(targetUserId, savedNotification);

    console.log(
      `Notification sent to user ${targetUserId}: ${savedNotification.message}`
    );
  }
);

const sendNotificationToPandits = asyncHandler(
  async (targetUserId, notificationData, pujaInfo, bookingInfo, userInfo) => {
    // Step 1: Save the notification to the database
    notificationData.userId = targetUserId; // Include the user ID in the notification
    const savedNotification = await saveNotificationToDatabase(
      notificationData
    );

    //Add pujaInfo, bookingInfo and userInfo to the notification
    savedNotification.pujaInfo = pujaInfo;
    savedNotification.bookingInfo = bookingInfo;
    savedNotification.userInfo = userInfo;

    // Step 2: Send the notification to the specific user via WebSocket
    wss.sendNotificationToSpecificUser(targetUserId, savedNotification);

    console.log(
      `Notification sent to user ${targetUserId}: ${savedNotification.message}`
    );
  }
);

export { sendNotificationToSpecificUser, sendNotificationToPandits };
