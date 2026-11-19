import { prisma } from "../config/prisma.js";

interface GetUserChatsInput {
  userId: string;
}

export async function getUserChatsService(
  data: GetUserChatsInput
) {
  const { userId } = data;

  // Step 1: Verify that the user exists
  const user = await prisma.user.findUnique({
    where: {
      id: userId
    },
    select: {
      id: true
    }
  });

  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  // Step 2: Find all chats where this user is a member
  const chats = await prisma.chat.findMany({
    where: {
      members: {
        some: {
          userId
        }
      }
    },

    // Step 3: Return the newest chats first
    orderBy: {
      updatedAt: "desc"
    },

    // Step 4: Select the required fields
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,

      members: {
        select: {
          userId: true
        }
      }
    }
  });

  // Step 5: Format the response
  return chats.map((chat) => ({
    chatId: chat.id,
    createdAt: chat.createdAt,
    updatedAt: chat.updatedAt,
    members: chat.members
  }));
}