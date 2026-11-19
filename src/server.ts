
import "dotenv/config";

import app from "./app.js";
import { prisma } from "./config/prisma.js";
import { firestore } from "./config/firebase.js";

const PORT = process.env.PORT || 5000;

async function startServer(): Promise<void> {
  try {
    // Connect PostgreSQL
    await prisma.$connect();

    console.log("PostgreSQL connected successfully");

    // Verify Firestore connection
    await firestore.listCollections();

    console.log("Firebase Firestore connected successfully");

    // Start Express server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

  } catch (error) {
    console.error("Failed to start server:", error);

    await prisma.$disconnect();

    process.exit(1);
  }
}

startServer();
