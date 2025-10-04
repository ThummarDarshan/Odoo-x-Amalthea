import express from "express";
import cors from "cors";
import { connectDB } from "./DB/Database.js";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import helmet from "helmet";
import morgan from "morgan";
import multer from "multer";
import transactionRoutes from "./Routers/Transactions.js";
import userRoutes from "./Routers/userRouter.js";
import userManagementRoutes from "./Routers/userManagementRouter.js";
import companyRoutes from "./Routers/companyRouter.js";
import expenseRoutes from "./Routers/expenseRouter.js";
import approvalRuleRoutes from "./Routers/approvalRuleRouter.js";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });
const app = express();

const port = process.env.PORT;

// Connect to database (optional for development)
try {
  connectDB();
} catch (error) {
  console.log("Database connection failed, running without database for development");
}

const allowedOrigins = [
  "https://main.d1sj7cd70hlter.amplifyapp.com",
  "https://expense-tracker-app-three-beryl.vercel.app",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  // add more origins as needed
];

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));
app.use(morgan("dev"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Router
app.use("/api/v1", transactionRoutes);
app.use("/api/auth", userRoutes);
app.use("/api/users", userManagementRoutes);
app.use("/api/company", companyRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/approval-rules", approvalRuleRoutes);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Server is listening on http://localhost:${port}`);
});
