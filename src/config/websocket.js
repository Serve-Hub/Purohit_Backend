import { WebSocketServer } from "ws";
import url from "url";
import User from "../models/user.model.js";

function setupWebSocket(server) {
  const wss = new WebSocketServer({ server });

  // Map to store active WebSocket connections
  const clients = new Map();

  wss.on("connection", async (ws, req) => {
    const queryObject = url.parse(req.url, true).query;
    const userId = queryObject.userID;

    try {
      const user = await User.findById(userId).select(
        "-password -refreshToken"
      );
      if (!user) {
        console.error(`User not found for userID: ${userId}`);
        ws.close(4002, "User authentication fobjectailed.");
        return;
      }

      clients.set(userId, ws);

      console.log(`User connected: ${userId}`);
      // console.log(clients.get(userId));
      const heartbeat = () => (ws.isAlive = true);
      ws.isAlive = true;
      ws.on("pong", heartbeat);

      ws.on("message", (message) => {
        console.log(`Received message from ${userId}: ${message}`);
      });

      ws.on("close", () => {
        clients.delete(userId);
        ws.removeAllListeners();
        console.log(`User disconnected: ${userId}`);
      });
    } catch (error) {
      console.error(`Error during WebSocket setup: ${error.message}`);
      ws.close(4002, "Internal server error during WebSocket setup.");
    }
  });

  // setInterval(() => {
  //   wss.clients.forEach((client) => {
  //     if (!client.isAlive) {
  //       console.log("Terminating stale connection");
  //       return client.terminate();
  //     }
  //     client.isAlive = false;
  //     client.ping();
  //   });
  // }, 30000); // Heartbeat check every 30 seconds

  return {
    sendNotificationToSpecificUser: (targetUserId, notification) => {
      const userId = targetUserId.toString();
      const client = clients.get(userId);
      if (client && client.readyState === client.OPEN) {
        client.send(JSON.stringify(notification));
        console.log(`Socket Notification sent to user: ${userId}`);
      } else {
        console.log(`Target user ${userId} is not connected`);
      }
    },

    broadcastNotification: (notification, senderId) => {
      for (const [userId, client] of clients.entries()) {
        if (userId === senderId) continue; // Skip sending notification to the sender
        if (client.readyState === client.OPEN) {
          client.send(JSON.stringify(notification));
          console.log(`Notification sent to user: ${userId}`);
        }
      }
    },
  };
}

export { setupWebSocket };
