// websocket.config.js
import { WebSocketServer } from "ws";
import jwt from "jsonwebtoken";

function setupWebSocket(server) {
  const wss = new WebSocketServer({ server });

  // Map to store active WebSocket connections
  const clients = new Map();

  wss.on("connection", (ws, req) => {
    // Extract token from the connection query string
    const token = new URLSearchParams(req.url.split("?")[1]).get("token");

    if (!token) {
      ws.close(4001, "Token not provided");
      return;
    }

    try {
      // Verify JWT token and get user information
      const user = jwt.verify(token, "yourSecretKey"); // Replace 'yourSecretKey' with your JWT secret
      clients.set(user.id, ws); // Store connection in the Map using user ID

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
