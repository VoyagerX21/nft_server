import axios from "axios";
import FormData from "form-data";
import dotenv from "dotenv";
dotenv.config();

const PINATA_JWT = process.env.PINATA_JWT;

/**
 * Uploads an image buffer and metadata JSON to IPFS via Pinata.
 * Works on Vercel (no fs, no local file system).
 *
 * @param {Buffer} imageBuffer - Raw file buffer from Multer memory storage
 * @param {Object} meta - Metadata object { name, description }
 * @returns {String} metadataURI - Final ipfs:// CID link for NFT metadata
 */
export async function uploadToIPFS(imageBuffer, meta) {
  if (!PINATA_JWT) {
    throw new Error("❌ PINATA_JWT is missing in environment variables");
  }

  try {
    //
    // 1️⃣ Upload IMAGE to Pinata using Buffer (Vercel-safe)
    //
    console.log("📤 Starting image upload to Pinata...");
    console.log("   Buffer size:", imageBuffer.length, "bytes");
    
    const form = new FormData();
    form.append("file", imageBuffer, {
      filename: "upload.png",    // any file name is fine
      contentType: "image/png",  // optional
    });

    const startTime = Date.now();
    console.log("   Sending request to Pinata API...");
    
    const imageUpload = await axios.post(
      "https://api.pinata.cloud/pinning/pinFileToIPFS",
      form,
      {
        maxBodyLength: Infinity,
        timeout: 30000, // 30 second timeout for image upload
        headers: {
          Authorization: `Bearer ${PINATA_JWT}`,
          ...form.getHeaders(), // include multipart headers
        },
      }
    );

    const uploadTime = Date.now() - startTime;
    console.log(`   ✅ Image upload completed in ${uploadTime}ms`);

    const imageCID = imageUpload.data.IpfsHash;
    const imageURI = `ipfs://${imageCID}`;

    console.log("📸 Image uploaded:", imageURI);

    //
    // 2️⃣ Upload METADATA JSON to IPFS
    //
    console.log("📝 Starting metadata upload to Pinata...");
    const metadata = {
      name: meta?.name || "Stamp NFT",
      description: meta?.description || "",
      image: imageURI,
    };

    const metadataStartTime = Date.now();
    const metadataUpload = await axios.post(
      "https://api.pinata.cloud/pinning/pinJSONToIPFS",
      metadata,
      {
        timeout: 10000, // 10 second timeout for metadata upload
        headers: {
          Authorization: `Bearer ${PINATA_JWT}`,
          "Content-Type": "application/json",
        },
      }
    );

    const metadataTime = Date.now() - metadataStartTime;
    console.log(`   ✅ Metadata upload completed in ${metadataTime}ms`);

    const metadataCID = metadataUpload.data.IpfsHash;
    const metadataURI = `ipfs://${metadataCID}`;

    console.log("📝 Metadata uploaded:", metadataURI);
    console.log("✅ Total upload time:", Date.now() - startTime, "ms");

    return metadataURI;

  } catch (error) {
    console.error("❌ Pinata upload FAILED:", error.response?.data || error.message);
    
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      throw new Error("IPFS upload timed out. The file may be too large or Pinata API is slow. Please try again.");
    }
    
    if (error.response) {
      console.error("Pinata API error:", error.response.status, error.response.data);
      throw new Error(`IPFS upload failed: ${error.response.data?.error?.details || error.response.data?.error || 'Unknown error'}`);
    }
    
    throw new Error(`IPFS upload failed: ${error.message}`);
  }
}
