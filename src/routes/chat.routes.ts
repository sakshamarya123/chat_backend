import { Router } from "express";
import { createChatController } from "../controllers/chat.controller.js";
import { getMessagesController, markMessageReadController, sendMessageController, updateLastSeenController } from "../controllers/message.controller.js";
import { getUserChatsController } from "../controllers/user.controller.js";

const router = Router();

router.post("/create", createChatController);

router.post("/:chatId/message/send", sendMessageController);

router.get("/:chatId/messages", getMessagesController);

router.post(
  "/:chatId/message/:messageId/read",
  markMessageReadController
);

router.post("/:chatId/lastseen", updateLastSeenController);




export default router;