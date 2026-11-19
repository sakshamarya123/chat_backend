import { FieldPath, FieldValue } from "firebase-admin/firestore";
import { firestore } from "../config/firebase.js";
import { prisma } from "../config/prisma.js";

interface SendMessageInput {
  chatId: string;
  senderId: string;
  text: string;
}

interface GetMessagesInput {
  chatId: string;
  limit: number;
  cursor?: string;
}

interface MarkMessageReadInput {
  chatId: string;
  messageId: string;
  userId: string;
}

interface UpdateLastSeenInput {
  chatId: string;
  userId: string;
  messageId: string;
}

export async function updateLastSeenService(
  data: UpdateLastSeenInput
) {
  const { chatId, userId, messageId } = data;

  // Step 1: Verify that the chat exists
  const chat = await prisma.chat.findUnique({
    where: {
      id: chatId
    },
    select: {
      id: true
    }
  });

  if (!chat) {
    throw new Error("CHAT_NOT_FOUND");
  }

  // Step 2: Verify that the user belongs to this chat
  const membership = await prisma.chatMember.findUnique({
    where: {
      chatId_userId: {
        chatId,
        userId
      }
    },
    select: {
      id: true
    }
  });

  if (!membership) {
    throw new Error("USER_NOT_MEMBER");
  }

  // Step 3: Create Firestore references
  const chatRef = firestore.collection("chats").doc(chatId);

  const messageRef = chatRef
    .collection("messages")
    .doc(messageId);

  const lastSeenRef = chatRef
    .collection("lastSeen")
    .doc(userId);

  // Step 4: Update last seen transactionally
  const result = await firestore.runTransaction(async (transaction) => {
    const messageSnapshot = await transaction.get(messageRef);

    if (!messageSnapshot.exists) {
      throw new Error("MESSAGE_NOT_FOUND");
    }

    const messageData = messageSnapshot.data();

    if (!messageData?.createdAt) {
      throw new Error("MESSAGE_TIMESTAMP_MISSING");
    }

    const lastSeenSnapshot = await transaction.get(lastSeenRef);

    const newMessageTime = messageData.createdAt.toMillis();
    const newMessageId = messageSnapshot.id;

    let shouldUpdate = true;

    if (lastSeenSnapshot.exists) {
      const existingData = lastSeenSnapshot.data();

      const existingMessageTime =
        existingData?.lastSeenMessageCreatedAt?.toMillis();

      const existingMessageId =
        existingData?.lastSeenMessageId;

      if (existingMessageTime !== undefined) {
        // Compare timestamp first, then document ID
        // to handle messages with identical timestamps.
        shouldUpdate =
          newMessageTime > existingMessageTime ||
          (
            newMessageTime === existingMessageTime &&
            newMessageId > existingMessageId
          );
      }
    }

    if (shouldUpdate) {
      transaction.set(lastSeenRef, {
        userId,
        lastSeenMessageId: messageId,
        lastSeenMessageCreatedAt: messageData.createdAt,
        lastSeenAt: FieldValue.serverTimestamp()
      });
    }

    return {
      updated: shouldUpdate,
      messageId: shouldUpdate
        ? messageId
        : lastSeenSnapshot.data()?.lastSeenMessageId
    };
  });

  // Step 5: Fetch the final last-seen document
  const finalSnapshot = await lastSeenRef.get();
  const finalData = finalSnapshot.data();

  return {
    userId,
    lastSeenMessageId: finalData?.lastSeenMessageId,
    lastSeenAt:
      finalData?.lastSeenAt?.toDate().toISOString() ?? null,
    updated: result.updated
  };
}

export async function markMessageReadService(
  data: MarkMessageReadInput
) {
  const { chatId, messageId, userId } = data;

  // Step 1: Verify that the chat exists
  const chat = await prisma.chat.findUnique({
    where: {
      id: chatId
    },
    select: {
      id: true
    }
  });

  if (!chat) {
    throw new Error("CHAT_NOT_FOUND");
  }

  // Step 2: Verify that the user belongs to this chat
  const membership = await prisma.chatMember.findUnique({
    where: {
      chatId_userId: {
        chatId,
        userId
      }
    },
    select: {
      id: true
    }
  });

  if (!membership) {
    throw new Error("USER_NOT_MEMBER");
  }

  // Step 3: Find the message in Firestore
  const messageRef = firestore
    .collection("chats")
    .doc(chatId)
    .collection("messages")
    .doc(messageId);

  const messageSnapshot = await messageRef.get();

  if (!messageSnapshot.exists) {
    throw new Error("MESSAGE_NOT_FOUND");
  }

  // Step 4: Create a unique read receipt reference
  const receiptId = `${messageId}_${userId}`;

  const receiptRef = firestore
    .collection("chats")
    .doc(chatId)
    .collection("readReceipts")
    .doc(receiptId);

  // Step 5: Create the receipt only if it doesn't already exist
  await firestore.runTransaction(async (transaction) => {
    const existingReceipt = await transaction.get(receiptRef);

    if (!existingReceipt.exists) {
      transaction.set(receiptRef, {
        messageId,
        userId,
        readAt: FieldValue.serverTimestamp()
      });
    }
  });

  // Step 6: Fetch the saved receipt
  const receiptSnapshot = await receiptRef.get();
  const receipt = receiptSnapshot.data();

  return {
    receiptId,
    messageId,
    userId,
    readAt: receipt?.readAt?.toDate().toISOString() ?? null
  };
}

export async function getMessagesService(data: GetMessagesInput) {
  const { chatId, limit, cursor } = data;

  // Step 1: Verify that the chat exists in PostgreSQL
  const chat = await prisma.chat.findUnique({
    where: {
      id: chatId
    },
    select: {
      id: true
    }
  });

  if (!chat) {
    throw new Error("CHAT_NOT_FOUND");
  }

  // Step 2: Reference the messages collection in Firestore
  const messagesRef = firestore
    .collection("chats")
    .doc(chatId)
    .collection("messages");

  // Step 3: Build the Firestore query
  let query = messagesRef
    .orderBy("createdAt", "desc")
    .orderBy(FieldPath.documentId(), "desc");

  // Step 4: Apply cursor pagination if provided
  if (cursor) {
    const cursorSnapshot = await messagesRef.doc(cursor).get();

    if (!cursorSnapshot.exists) {
      throw new Error("CURSOR_NOT_FOUND");
    }

    query = query.startAfter(cursorSnapshot);
  }

  // Step 5: Fetch one extra document to determine hasMore
  const snapshot = await query.limit(limit + 1).get();

  const hasMore = snapshot.docs.length > limit;

  // Keep only the requested number of messages
  const pageDocs = snapshot.docs.slice(0, limit);

  // Step 6: Convert Firestore documents into response objects
  const messages = pageDocs.map((doc) => {
    const message = doc.data();

    return {
      messageId: doc.id,
      senderId: message.senderId as string,
      text: message.text as string,
      createdAt: message.createdAt.toDate().toISOString()
    };
  });

  // Step 7: Return messages in chronological order
  messages.reverse();

  // The last document in descending order is the oldest
  // document in this page. Use it to fetch older messages.
  const nextCursor = hasMore
    ? pageDocs[pageDocs.length - 1].id
    : null;

  return {
    messages,
    nextCursor,
    hasMore
  };
}

export async function sendMessageService(data: SendMessageInput) {
  const { chatId, senderId, text } = data;

  // Step 1: Check whether the chat exists
  const chat = await prisma.chat.findUnique({
    where: {
      id: chatId
    },
    select: {
      id: true
    }
  });

  if (!chat) {
    throw new Error("CHAT_NOT_FOUND");
  }

  // Step 2: Verify that the sender belongs to this chat
  const membership = await prisma.chatMember.findUnique({
    where: {
      chatId_userId: {
        chatId,
        userId: senderId
      }
    },
    select: {
      id: true
    }
  });

  if (!membership) {
    throw new Error("SENDER_NOT_MEMBER");
  }

  // Step 3: Generate a Firestore document reference
  const messageRef = firestore
    .collection("chats")
    .doc(chatId)
    .collection("messages")
    .doc();

  // Step 4: Store the message in Firestore
  await messageRef.set({
    senderId,
    text,
    createdAt: FieldValue.serverTimestamp()
  });

  // Step 5: Read the saved document to get its server timestamp
  const savedMessage = await messageRef.get();

  const messageData = savedMessage.data();

  return {
    messageId: messageRef.id,
    chatId,
    senderId,
    text,
    createdAt: messageData?.createdAt?.toDate().toISOString() ?? null
  };
}

