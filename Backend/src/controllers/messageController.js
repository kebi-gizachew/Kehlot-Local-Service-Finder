import { prisma } from "../config/db.js";

export const getOrCreateConversation = async (req, res) => {
  try {
    console.log("back1")
    const userId = req.user.id; 
    console.log(userId)              // from cookie/JWT
    const providerId = req.params.providerId;
    console.log(userId, providerId);

    let conversation = await prisma.conversation.findUnique({
      where: {
        userId_providerId: {
          userId,
          providerId
        }
      }
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          userId,
          providerId
        }
      });
    }
    console.log("conversation", conversation);
    res.json(conversation);
  } catch (err) {
    console.log("cant fetch")
    res.status(500).json({ error: "Conversation error" });
  }
};

export const getConversationById = async (req, res) => {
  try {
    console.log("b")
    const { conversationId } = req.params; // expect URL param
console.log("going"+conversationId)
    // Fetch conversation by id and include related info
    const conversation = await prisma.conversation.findUnique({
      where: {
        id: conversationId,
      },
      include: {
        user: true,      // include User details
        provider: true,  // include ServiceProvider details
        messages: true,  // include all messages
      },
    });

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }
    console.log(conversation)
    res.status(200).json(conversation);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

export const getMessages = async (req, res) => {
  try {
    const conversationId = req.params.conversationId;

    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" }
    });
    console.log(messages)
    res.json(messages);
  } catch {
    res.status(500).json({ error: "Failed to load messages" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { content,senderId,senderType ,image} = req.body;
    console.log(senderId,senderType)
    const conversationId = req.params.conversationId;
 const stringSenderId = String(senderId);
    // Verify user is participant in conversation
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId }
    });

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }
    const message = await prisma.message.create({
      data: {
        content,
        image,
        sender: senderType,
        senderId:stringSenderId,
        conversationId
      }
    });
    console.log("Message sent:", message);
    res.json(message);
  } catch (err) {
    console.error("Error sending message:", err);
    res.status(500).json({ error: "Failed to send message" });
  }
};

export const deleteMessageById = async (req, res) => {
  try {
    const { messageId } = req.params;

    // Check if the message exists
    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    // Delete the message
    await prisma.message.delete({
      where: { id: messageId },
    });

    res.status(200).json({ message: "Message deleted successfully" });
  } catch (err) {
    console.error("Error deleting message:", err);
    res.status(500).json({ error: "Failed to delete message" });
  }
};

export const getProviderConversations = async (req, res) => {
  const providerId = req.user.id; 
  try {
    const conversations = await prisma.conversation.findMany({
      where: {
        providerId
      },
      include: {
        user: true,
        provider: true,
        messages: true
      }
    });
    console.log(conversations);
    res.json(conversations);
  } catch (err) {
    res.status(500).json({ error: "Failed to load conversations" });
  }
};
export const getUserConversations = async (req, res) => {
  console.log("at the bakc")
  const userId = req.user.id; 
  console.log(userId)
  try {
    const conversations = await prisma.conversation.findMany({
      where: {
        userId
      },
      include: {
        user: true,
        provider: true,
        messages: true
      }
    });
    console.log(conversations);
    res.json(conversations);
  } catch (err) {
    res.status(500).json({ error: "Failed to load conversations" });
  }
};