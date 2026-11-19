import type { Request, Response } from "express";
import { getUserChatsSchema } from "../validators/user.validator.js";
import { getUserChatsService } from "../services/user.service.js";

export async function getUserChatsController(
  req: Request,
  res: Response
): Promise<void> {

  // Step 1: Validate userId from URL
  const validation = getUserChatsSchema.safeParse({
    userId: req.params.userId
  });

  if (!validation.success) {
    res.status(400).json({
      success: false,
      message: "Invalid user ID",
      errors: validation.error.issues
    });
    return;
  }

  try {
    // Step 2: Call service
    const chats = await getUserChatsService(validation.data);

    // Step 3: Return response
    res.status(200).json({
      success: true,
      data: {
        chats
      }
    });

  } catch (error) {
    if (error instanceof Error && error.message === "USER_NOT_FOUND") {
      res.status(404).json({
        success: false,
        message: "User not found"
      });
      return;
    }

    console.error("Get user chats error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch user chats"
    });
  }
}