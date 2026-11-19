import { z } from "zod";

export const createChatSchema = z.object({
  userAId: z.string(),
  userBId: z.string()
}).refine(
  (data) => data.userAId !== data.userBId,
  {
    message: "A user cannot create a chat with themselves"
  }
);