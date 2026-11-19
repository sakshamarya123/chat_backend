import { prisma } from "../config/prisma.js";

interface CreateChatInput {
  userAId: string;
  userBId: string;
}

export async function createChatService(data: CreateChatInput) {
  const { userAId, userBId } = data;

  // Step 1: Verify both users exist
  const users = await prisma.user.findMany({
    where: {
      id: {
        in: [userAId, userBId]
      }
    },
    select: {
      id: true
    }
  });

  if (users.length !== 2) {
    throw new Error("One or both users do not exist");
  }

  // Step 2: Generate a unique key for this user pair
  const directKey = [userAId, userBId].sort().join(":");

  // Step 3: Find existing chat or create a new one
  const chat = await prisma.chat.upsert({
    where: {
      directKey
    },
    update: {},
    create: {
      directKey,
      members: {
        create: [
          {
            userId: userAId
          },
          {
            userId: userBId
          }
        ]
      }
    },
    select: {
      id: true
    }
  });

  return chat;
}