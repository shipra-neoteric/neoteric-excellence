import "dotenv/config";
import cors from "cors";
import express from "express";
import assessmentsRoutes from "./routes/assessments.js";
import attendanceRoutes from "./routes/attendance.js";
import authRoutes from "./routes/auth.js";
import batchesRoutes from "./routes/batches.js";
import buddyRatingsRoutes from "./routes/buddyRatings.js";
import checklistRoutes from "./routes/checklist.js";
import logsRoutes from "./routes/logs.js";
import modulesRoutes from "./routes/modules.js";
import podsRoutes from "./routes/pods.js";
import rotationsRoutes from "./routes/rotations.js";
import settingsRoutes from "./routes/settings.js";
import traineesRoutes from "./routes/trainees.js";
import usersRoutes from "./routes/users.js";
import videosRoutes from "./routes/videos.js";
import { connectDB } from "./db/connect.js";
import { seedIfEmpty } from "./db/seed.js";
import { requireAuth } from "./middleware/auth.js";

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || process.env.FRONTEND_URL }));
// 15mb limit — checklist photo evidence and module attachments (PDF/DOC/image) go
// through as base64 data URLs (Cloudinary accepts them directly, no multer needed).
app.use(express.json({ limit: "15mb" }));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);

app.use("/api", requireAuth);

app.use("/api/trainees", traineesRoutes);
app.use("/api/batches", batchesRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/logs", logsRoutes);
app.use("/api/assessments", assessmentsRoutes);
app.use("/api/modules", modulesRoutes);
app.use("/api/videos", videosRoutes);
app.use("/api/checklist", checklistRoutes);
app.use("/api/buddy-ratings", buddyRatingsRoutes);
app.use("/api/rotations", rotationsRoutes);
app.use("/api/pods", podsRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/settings", settingsRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

const port = process.env.PORT || 4000;

if (!process.env.JWT_SECRET) {
  console.error("Failed to start: JWT_SECRET is not set");
  process.exit(1);
}

connectDB()
  .then(() => seedIfEmpty())
  .then(() => {
    app.listen(port, () => {
      console.log(`Neoteric Excellence API listening on port ${port}`);
    });
  })
  .catch((err) => {
    console.error("Failed to start: could not connect to MongoDB", err);
    process.exit(1);
  });
