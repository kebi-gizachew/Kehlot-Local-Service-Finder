import {PrismaClient} from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon"; // or { PrismaPg } from "@prisma/adapter-pg"

if (!process.env.DATABASE_URL) {
  console.error("Missing DATABASE_URL environment variable. Make sure .env is loaded before importing db.");
  throw new Error("Missing DATABASE_URL");
}

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL,
});

//auto complete table
const prisma = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
});

//now we will define a function that connects and disconnects our database ,both are asynchronous operations

const connectDB = async () => {
    try{
        await prisma.$connect();
        console.log("DB Connected via Prisma");
    }catch(error){
        console.error(`Database connection error: ${error.message} `);
        process.exit(1);  // immediately stops the nodejs app and tells out system that it ended because of an error
    }
};

const disconnectDB = async () => {
    await prisma.$disconnect();
};


export {prisma, connectDB, disconnectDB};

