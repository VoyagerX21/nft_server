// nftRoutes.js
import express from "express";
import multer from "multer";
import { uploadToIPFS } from "../utils/ipfsUpload.js";

const router = express.Router();

// Vercel-compatible: use memory storage (NO disk)
const upload = multer({ storage: multer.memoryStorage() });

router.get("/healthCheck", (req, res) => {
  res.json({
    success: true,
    message: "Server is running",
  });
});

router.post("/upload", upload.single("file"), async (req, res) => {
  console.log("🔥 /api/upload route hit");
  console.log("Request body keys:", Object.keys(req.body || {}));
  console.log("Request file:", req.file ? { 
    fieldname: req.file.fieldname,
    originalname: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size 
  } : "No file");
  
  try {
    // Validate file
    if (!req.file) {
      console.error("❌ No file in request");
      return res.status(400).json({
        success: false,
        message: "No file uploaded.",
      });
    }

    // Validate metadata
    const { name, description } = req.body;
    console.log("📋 Form data - name:", name, "description:", description);

    if (!name) {
      console.error("❌ Missing name in request");
      return res.status(400).json({
        success: false,
        message: "Metadata 'name' is required.",
      });
    }

    console.log("📤 Upload request received:");
    console.log("   File:", req.file.originalname, "Size:", req.file.size, "bytes");
    console.log("   Name:", name);
    console.log("   Description:", description || "(none)");

    // Upload to Pinata using BUFFER instead of file path
    console.log("🚀 Starting IPFS upload...");
    const metadataCID = await uploadToIPFS(req.file.buffer, {
      name,
      description,
    });

    const gatewayURL = `https://gateway.pinata.cloud/ipfs/${metadataCID.replace("ipfs://", "")}`;

    console.log("✅ IPFS upload successful:");
    console.log("   metadataCID:", metadataCID);
    console.log("   gatewayURL:", gatewayURL);

    // Response
    res.json({
      success: true,
      metadataURL: gatewayURL,
    });

  } catch (err) {
    console.error("❌ Upload route error:", err);
    console.error("Error stack:", err.stack);

    res.status(500).json({
      success: false,
      message: "Upload failed",
      error: err.message || "Unknown error",
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    });
  }
});

export default router;
