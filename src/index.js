import express from "express";
import "dotenv/config";

import authRoutes from "./routes/authRoutes.js";
import barberRoutes from "./routes/barberRoutes.js";
import { connectDB } from "./lib/db.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/barbers", barberRoutes);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    connectDB();
});
