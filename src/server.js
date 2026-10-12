import express from "express";

//impot Routes.
import movieRoutes from './routes/movieRoutes.js';
import dotenv from 'dotenv';
import {connectDB , disconnectDB} from './config/db.js'
dotenv.config();
connectDB();

const app = express();
const port = process.env.PORT || 5001;


app.use('/movies', movieRoutes);

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