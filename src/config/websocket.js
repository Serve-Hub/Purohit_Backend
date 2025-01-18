// websocket.config.js
import { WebSocketServer } from "ws";

import User from "../models/user.model.js";

function setupWebSocket(server) {
  const wss = new WebSocketServer({ server });

  // Map to store active WebSocket connections
  const clients = new Map();

  wss.on("connection", async (ws, req) => {
    const params = new URLSearchParams(req.url.split("?")[1]);
    const userId = params.get("userID");
    try {
      const user = await User.findById(userId).select(
        "-password -refreshToken"
      );
      if (!user) {
        throw new ApiError(401, "User not found for the given token");
      }
      clients.set(user._id, ws);
      console.log(`User connected: ${user._id}`);

      ws.on("message", (message) => {
        console.log(`Received message from ${user._id}: ${message}`);
      });

      ws.on("close", () => {
        clients.delete(user._id);
        console.log(`User disconnected: ${user._id}`);
      });
    } catch (error) {
      ws.close(4002, "Invalid token");
    }
  });

  return {
    sendNotificationToSpecificUser: (targetUserId, notification) => {
      const client = clients.get(targetUserId);
      if (client && client.readyState === client.OPEN) {
        client.send(JSON.stringify(notification));
        console.log(`Socket Notification sent to user: ${targetUserId}`);
      } else {
        console.log(`Target user ${targetUserId} is not connected`);
      }
    },

    broadcastNotification: (notification, senderId) => {
      for (const [userId, client] of clients.entries()) {
        // Skip sending the notification to the sender
        if (userId === senderId) continue;

        if (client.readyState === client.OPEN) {
          client.send(JSON.stringify(notification));
          console.log(`Notification sent to user: ${userId}`);
        }
      }
    },
  };
}

export { setupWebSocket };
