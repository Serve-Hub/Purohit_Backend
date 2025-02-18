import app from "./app.js";
import connectDB from "./config/database.js";
import http from "http";
import { setupWebSocket } from "./config/websocket.js";

//Assigning a port
const PORT = process.env.PORT;
const server = http.createServer(app);

let wss;

const startServer = async () => {
  try {
    // Database Connection
    await connectDB();

    // Set up WebSocket with the HTTP server
    wss = setupWebSocket(server);

    // Start the server
    server.listen(PORT, () => {
      console.log(`App is listening at port ${PORT}`);
    });

    // Optionally, log WebSocket server initialization
    console.log("WebSocket server initialized!");
  } catch (error) {
    console.error("Failed to start the server:", error.message);
  }
};

// Start the application
startServer();
export { wss };
