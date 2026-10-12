//create an instance of the prisma client
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

const prisma = new PrismaClient({
   adapter,
   log: process.env.NODE_ENV === "development" ? ["query","error","warn"] : ["error"],
});

const connectDB= async () =>{
    try{
        await prisma.$connect();
        console.log("Database connected successfully");
    } catch (error) {
        console.error("Error connecting to database:", error);
        process.exit(1);
    }
}

const disconnectDB = async () =>{
    try {
        await prisma.$disconnect();
        console.log("Database disconnected successfully");
    } catch (error) {
        console.error("Error disconnecting from database:", error);
        process.exit(1);    
    }
}

export { prisma, connectDB, disconnectDB };