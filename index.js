import express from "express";
import cors from "cors";
import nftRoutes from "./routes/nftRoutes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

app.use("/api", nftRoutes);

app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Stamp NFT API is running" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});

export default app;

