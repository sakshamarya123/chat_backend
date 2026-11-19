import express from "express";
import cors from "cors";

import chatRoutes from "./routes/chat.routes.js";
import userRoutes from "./routes/user.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Chat backend is running"
  });
});

app.use("/chat", chatRoutes);
app.use("/user", userRoutes);

export default app;