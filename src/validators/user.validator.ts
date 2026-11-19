import { z } from "zod";

export const getUserChatsSchema = z.object({
  userId: z.string().uuid()
});