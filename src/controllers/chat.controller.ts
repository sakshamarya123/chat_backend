import type { Request, Response } from "express";
import { createChatSchema } from "../validators/chat.validator.js";
import { createChatService } from "../services/chat.service.js";

export async function createChatController(
  req: Request,
  res: Response
): Promise<void> {

  const validation = createChatSchema.safeParse(req.body);

  if (!validation.success) {
    res.status(400).json({
      success: false,
      message: "Invalid request data",
      errors: validation.error.issues
    });
    return;
  }

  try {
    const chat = await createChatService(validation.data);

    res.status(200).json({
      success: true,
      message: "Chat created or already exists",
      data: {
        chatId: chat.id
      }
    });

  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "Internal server error";

    if (message === "One or both users do not exist") {
      res.status(404).json({
        success: false,
        message
      });
      return;
    }

    console.error("Create chat error:", error);

    res.status(500).json({
      success: false,
      message: "Something went wrong"
    });
  }
}