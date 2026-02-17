import dotenv from "dotenv";
dotenv.config({ path: "./.env" });
import {  httpServer } from "./app.js";
import connectDB from "./db/index.js";


const port = process.env.PORT || 3000;

// Mongodb Database configuration
connectDB()
  .then(() => {
    // Create HTTP server using the Express app
    
    // Start the HTTP server (and WebSocket server together)
    httpServer.listen(port, () => {
      console.log("Server is running on port", port);
    });
  })
  .catch((err) => console.log("MongoDB connection failed", err));
