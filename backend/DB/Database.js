import mongoose from "mongoose";

export const connectDB = async (req, res) => {
    try {
        const mongoUri = process.env.MONGO_URI;
        const dbName = process.env.MONGO_DB_NAME;
        
        if (!mongoUri || !dbName) {
            console.log("MongoDB URI or DB name not provided, skipping database connection");
            return;
        }

        const { connection } = await mongoose.connect(mongoUri + '/' + dbName, { useNewUrlParser: true, useUnifiedTopology: true });
        console.log(`MongoDB Connected to ${connection.host}`);
    } catch (error) {
        console.log("MongoDB connection failed:", error.message);
        console.log("Server will continue without database connection");
    }
}