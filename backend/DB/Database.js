import mongoose from "mongoose";

export const connectDB = async (req, res) => {
    try {
        const db = process.env.MONGO_URL;
        
        if (!db) {
            console.log("No MongoDB URL provided, skipping database connection");
            return;
        }

        const {connection} = await mongoose.connect(db, { useNewUrlParser: true });
        console.log(`MongoDB Connected to ${connection.host}`);
    } catch (error) {
        console.log("MongoDB connection failed:", error.message);
        console.log("Server will continue without database connection");
    }
}