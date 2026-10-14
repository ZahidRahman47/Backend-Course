import express from "express";
import cookieParser from "cookie-parser";

//impot Routes.
import movieRoutes from './routes/movieRoutes.js';
import authRoutes from "./routes/authRoutes.js"
import watchlistRoutes from "./routes/watchlistRoutes.js"
import dotenv from 'dotenv';
import { connectDB, disconnectDB } from './config/db.js'
import { notFound, errorHandler } from './middleware/errorMiddleware.js'
dotenv.config();
connectDB();

const app = express();
const port = process.env.PORT || 5001;


//body parser middleware logic 
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

//core middlewares 
app.use('/movies', movieRoutes);
app.use('/auth', authRoutes);
app.use('/watchlist' , watchlistRoutes)

//error middlewares, must stay after the routes
app.use(notFound)
app.use(errorHandler)

const server = app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

process.on("unhandledRejection", (err, promise) => {
    console.log(`Logged Error: ${err}`);
    disconnectDB();
    server.close(() => process.exit(1));
});

process.on("uncaughtException", (err, promise) => {
    console.log(`Logged Error: ${err}`);
    disconnectDB();
    server.close(() => process.exit(1));
});

process.on("SIGTERM", () => {
    console.log("SIGTERM received, shutting down gracefully");
    disconnectDB();
    server.close(() => {
        console.log("Process terminated!");
    });
}); 