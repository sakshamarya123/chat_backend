import { z } from "zod";

export const sendMessageSchema = z.object({
  chatId: z.string(),
  senderId: z.string(),
  text: z.string().trim().min(1).max(5000)
});

export const getMessagesSchema = z.object({
  chatId: z.string(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional()
});

export const markMessageReadSchema = z.object({
  chatId: z.string(),
  messageId: z.string().min(1),
  userId: z.string().uuid()
});

export const updateLastSeenSchema = z.object({
  chatId: z.string(),
  userId: z.string(),
  messageId: z.string().min(1)
});