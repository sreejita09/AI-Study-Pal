const fs = require("fs");
const path = require("path");
const pdfParse = require("pdf-parse");
const Upload = require("../models/Upload");
const asyncHandler = require("../utils/asyncHandler");

const MIN_TEXT_LENGTH = 50; // below this → set fallback flag

const uploadFile = asyncHandler(async (req, res) => {
  if (!req.file) {
    console.warn("[upload] No file in request");
    return res.status(400).json({ message: "No file received. Select a PDF or text file." });
  }

  console.log("[upload] Received:", req.file.originalname, "| mime:", req.file.mimetype, "| size:", req.file.size);

  let extractedText = "";
  let fallback = false;
  const filePath = path.resolve(req.file.path);

  try {
    const mime = req.file.mimetype;

    if (mime === "application/pdf") {
      const dataBuffer = fs.readFileSync(filePath);
      const result = await pdfParse(dataBuffer);
      extractedText = (result.text || "").replace(/\s{3,}/g, "\n").trim();
    } else {
      // text/plain, text/csv, etc.
      extractedText = fs.readFileSync(filePath, "utf-8").trim();
    }
  } catch (err) {
    console.error("Text extraction error:", err.message);
    extractedText = "";
  }

  if (extractedText.length < MIN_TEXT_LENGTH) {
    fallback = true;
  }

  console.log("[upload] Extracted text length:", extractedText.length, "| fallback:", fallback);

  const upload = await Upload.create({
    user: req.user._id,
    originalName: req.file.originalname,
    storedName: req.file.filename,
    mimeType: req.file.mimetype,
    path: req.file.path,
    size: req.file.size,
    category: req.file.mimetype === "application/pdf" ? "pdf" : "text",
  });

  res.status(201).json({
    success: true,
    fallback,
    message: fallback
      ? "File uploaded but text extraction was limited. You can paste text manually."
      : "File uploaded successfully.",
    upload,
    extractedText,
  });
});

const listUploads = asyncHandler(async (req, res) => {
  const uploads = await Upload.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json({ uploads });
});

const downloadUpload = asyncHandler(async (req, res) => {
  const upload = await Upload.findOne({
    _id: req.params.id,
    user: req.user._id
  });

  if (!upload) {
    return res.status(404).json({ message: "File not found" });
  }

  res.download(path.resolve(upload.path), upload.originalName);
});

module.exports = {
  uploadFile,
  listUploads,
  downloadUpload
};
