import Notification from "../models/notification.model.js";
import APIError from "../utils/ApiError.js";
/**
 * Send a notification to a user.
 * @param {Object} options - The options for creating the notification.
 * @param {string} options.userId - The ID of the user to send the notification to.
 * @param {string} options.message - The notification message.
 * @param {string} options.type - The type of notification.
 * @param {string} options.relatedId - The ID of the related resource.
 * @param {string} options.relatedModel - The name of the related model.
 * @returns {Promise<Object>} - The created notification.
 */
const sendNotification = async ({
  userId,
  message,
  type,
  relatedId,
  relatedModel,
}) => {
  try {
    // Create a new notification document
    console.log(userId)
    const notification = new Notification({
      userID: userId,
      message,
      type,
      relatedId,
      relatedModel,
      isRead: false,
      status: "Pending",
    });

    // Save the notification to the database
    const savedNotification = await notification.save();

    // Return the saved notification
    return savedNotification;
  } catch (error) {
    throw new APIError(
      500,
      `An error occurred while sending the notification:${error.message}`
    );
  }
};

export default sendNotification;
