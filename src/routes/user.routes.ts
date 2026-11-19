import { Router } from "express";
import { getUserChatsController } from "../controllers/user.controller.js";

const router = Router();

router.get("/:userId/chats", getUserChatsController);

export default router;