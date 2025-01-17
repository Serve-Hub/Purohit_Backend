import app from "./app.js";
import connectDB from "./config/database.js";
import http from "http";
import { setupWebSocket } from "./config/websocket.js";

//Assigning a port
const PORT = process.env.PORT;
const server = http.createServer(app);

//Database Connection
connectDB()
  .then(() => {
    // Create HTTP server to pass to WebSocket

    // Set up WebSocket with HTTP server

    server.listen(PORT, () => {
      console.log(`App is listening at port ${PORT}`);
    });
    setupWebSocket(server);
  })
  .catch((err) => {
    console.log("MONGO db connection failed!!!", err);
  });
