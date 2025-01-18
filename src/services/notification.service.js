import Notification from "../models/notification.model.js";
import { wss } from "../index.js"; // Import WebSocket instance from `index.js`

// Function to save the notification to the database
const saveNotificationToDatabase = async (notificationData) => {
  try {
    const notification = new Notification(notificationData);
    await notification.save();
    return notification;
  } catch (error) {
    console.error("Error saving notification to database:", error.message);
    throw error;
  }
};

const sendNotificationToSpecificUser = async (
  targetUserId,
  notificationData
) => {
  try {
    // Step 1: Save the notification to the database
    notificationData.userId = targetUserId; // Include the user ID in the notification
    const savedNotification = await saveNotificationToDatabase(
      notificationData
    );

    // Step 2: Send the notification to the specific user via WebSocket
    wss.sendNotificationToSpecificUser(targetUserId, savedNotification);
  } catch (error) {
    console.error(
      `Error sending notification to user ${targetUserId}:`,
      error.message
    );
  }
};

const sendNotificationToPandits = async (
  targetUserId,
  notificationData,
  pujaInfo,
  bookingInfo,
  userInfo
) => {
  try {
    // Step 1: Save the notification to the database
    notificationData.userId = targetUserId; // Include the user ID in the notification
    const savedNotification = await saveNotificationToDatabase(
      notificationData
    );

    // Add pujaInfo, bookingInfo, and userInfo to the notification
    savedNotification.pujaInfo = pujaInfo;
    savedNotification.bookingInfo = bookingInfo;
    savedNotification.userInfo = userInfo;

    // Step 2: Send the notification to the specific user via WebSocket
    wss.sendNotificationToSpecificUser(targetUserId, savedNotification);
  } catch (error) {
    console.error(
      `Error sending notification to pandit ${targetUserId}:`,
      error.message
    );
  }
};

export { sendNotificationToSpecificUser, sendNotificationToPandits };
