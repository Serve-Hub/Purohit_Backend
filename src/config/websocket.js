// websocket.config.js
import { WebSocketServer } from "ws";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

function setupWebSocket(server) {
  const wss = new WebSocketServer({ server });

  // Map to store active WebSocket connections
  const clients = new Map();

  wss.on("connection", async (ws, req) => {
    // Extract token from the connection query string
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "").trim();

    if (!token) {
      ws.close(4001, "Token not provided");
      return;
    }
    let decodedToken;
    try {
      decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        ws.close(4001, "Token has expired. Please log in again.");
      }
      if (err instanceof jwt.JsonWebTokenError) {
        ws.close(4001, "Invalid token format or signature.");
      }
      ws.close(4001, "Invalid access token, error unknown");
    }

    if (!decodedToken?._id) {
      ws.close(4001, "Invalid Access Token");
    }
    try {
      // Verify JWT token and get user information
      const user = await User.findById(decodedToken._id).select(
        "-password -refreshToken"
      );
      if (!user) {
        throw new ApiError(401, "User not found for the given token");
      }
      clients.set(user._id, ws);
      console.log(`User connected: ${user.id}`);

      ws.on("message", (message) => {
        console.log(`Received message from ${user.id}: ${message}`);
      });

      ws.on("close", () => {
        clients.delete(user.id);
        console.log(`User disconnected: ${user.id}`);
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
        console.log(`Notification sent to user: ${targetUserId}`);
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
