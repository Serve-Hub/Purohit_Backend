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
    console.log("savedNotification", savedNotification);
    console.log("pujaInfo", pujaInfo);
    console.log("bookingInfo", bookingInfo);

    const finalNotification = {
      ...savedNotification.toObject(), // Use toObject to convert the Mongoose document to plain object
      pujaInfo,
      bookingInfo,
      userInfo,
    };

    // Now, you can proceed with the logic to send the notification, whether through WebSocket, email, etc.
    console.log("Final notification prepared:", finalNotification);

    // Step 2: Send the notification to the specific user via WebSocket
    wss.sendNotificationToSpecificUser(targetUserId, finalNotification);
  } catch (error) {
    console.error(
      `Error sending notification to pandit ${targetUserId}:`,
      error.message
    );
  }
};

export { sendNotificationToSpecificUser, sendNotificationToPandits };
