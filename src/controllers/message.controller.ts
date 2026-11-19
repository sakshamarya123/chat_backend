import type { Request, Response } from "express";
import { getMessagesSchema, markMessageReadSchema, sendMessageSchema, updateLastSeenSchema } from "../validators/message.validator.js";
import { getMessagesService, markMessageReadService, sendMessageService, updateLastSeenService } from "../services/message.service.js";

export async function sendMessageController(
  req: Request,
  res: Response
): Promise<void> {

  const validation = sendMessageSchema.safeParse({
    chatId: req.params.chatId,
    senderId: req.body.senderId,
    text: req.body.text
  });

  if (!validation.success) {
    res.status(400).json({
      success: false,
      message: "Invalid request data",
      errors: validation.error.issues
    });
    return;
  }

  try {
    const message = await sendMessageService(validation.data);

    res.status(201).json({
      success: true,
      message: "Message sent successfully",
      data: message
    });

  } catch (error) {
    if (error instanceof Error && error.message === "CHAT_NOT_FOUND") {
      res.status(404).json({
        success: false,
        message: "Chat not found"
      });
      return;
    }

    if (error instanceof Error && error.message === "SENDER_NOT_MEMBER") {
      res.status(403).json({
        success: false,
        message: "Sender is not a member of this chat"
      });
      return;
    }

    console.error("Send message error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to send message"
    });
  }
}

export async function getMessagesController(
  req: Request,
  res: Response
): Promise<void> {

  const validation = getMessagesSchema.safeParse({
    chatId: req.params.chatId,
    limit: req.query.limit,
    cursor: req.query.cursor
  });

  if (!validation.success) {
    res.status(400).json({
      success: false,
      message: "Invalid request data",
      errors: validation.error.issues
    });
    return;
  }

  try {
    const result = await getMessagesService(validation.data);

    res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    if (error instanceof Error && error.message === "CHAT_NOT_FOUND") {
      res.status(404).json({
        success: false,
        message: "Chat not found"
      });
      return;
    }

    if (error instanceof Error && error.message === "CURSOR_NOT_FOUND") {
      res.status(400).json({
        success: false,
        message: "Invalid pagination cursor"
      });
      return;
    }

    console.error("Get messages error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch messages"
    });
  }
}

export async function markMessageReadController(
  req: Request,
  res: Response
): Promise<void> {

  const validation = markMessageReadSchema.safeParse({
    chatId: req.params.chatId,
    messageId: req.params.messageId,
    userId: req.body.userId
  });

  if (!validation.success) {
    res.status(400).json({
      success: false,
      message: "Invalid request data",
      errors: validation.error.issues
    });
    return;
  }

  try {
    const receipt = await markMessageReadService(validation.data);

    res.status(200).json({
      success: true,
      message: "Message marked as read",
      data: receipt
    });

  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "CHAT_NOT_FOUND") {
        res.status(404).json({
          success: false,
          message: "Chat not found"
        });
        return;
      }

      if (error.message === "USER_NOT_MEMBER") {
        res.status(403).json({
          success: false,
          message: "User is not a member of this chat"
        });
        return;
      }

      if (error.message === "MESSAGE_NOT_FOUND") {
        res.status(404).json({
          success: false,
          message: "Message not found"
        });
        return;
      }
    }

    console.error("Mark message read error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to mark message as read"
    });
  }
}

export async function updateLastSeenController(
  req: Request,
  res: Response
): Promise<void> {

  const validation = updateLastSeenSchema.safeParse({
    chatId: req.params.chatId,
    userId: req.body.userId,
    messageId: req.body.messageId
  });

  if (!validation.success) {
    res.status(400).json({
      success: false,
      message: "Invalid request data",
      errors: validation.error.issues
    });
    return;
  }

  try {
    const result = await updateLastSeenService(validation.data);

    res.status(200).json({
      success: true,
      message: result.updated
        ? "Last seen updated successfully"
        : "Last seen is already ahead of this message",
      data: result
    });

  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "CHAT_NOT_FOUND") {
        res.status(404).json({
          success: false,
          message: "Chat not found"
        });
        return;
      }

      if (error.message === "USER_NOT_MEMBER") {
        res.status(403).json({
          success: false,
          message: "User is not a member of this chat"
        });
        return;
      }

      if (error.message === "MESSAGE_NOT_FOUND") {
        res.status(404).json({
          success: false,
          message: "Message not found"
        });
        return;
      }

      if (error.message === "MESSAGE_TIMESTAMP_MISSING") {
        res.status(500).json({
          success: false,
          message: "Message timestamp is missing"
        });
        return;
      }
    }

    console.error("Update last seen error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update last seen"
    });
  }
}